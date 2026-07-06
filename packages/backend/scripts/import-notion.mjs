#!/usr/bin/env node
/**
 * One-shot Notion import — operator CLI wrapper (story #17).
 *
 * This is a thin, recette-only orchestrator around the internal Convex
 * functions `notionImport:validate` and `notionImport:importFromNotion`
 * (see docs/product/notion-import.md). It:
 *   1. reads the CSV export, the manually-prepared Horario correspondence map
 *      and the attachments folder;
 *   2. runs the DRY-RUN validation and prints the report — on a duplicate
 *      `Correo` it stops here with a non-zero exit so you clean the CSV and
 *      re-run (nothing is written);
 *   3. uploads each importable row's photos to Convex storage, in order;
 *   4. runs the real import and writes the generated passwords to a LOCAL,
 *      git-ignored file for manual WhatsApp hand-off. No email is ever sent.
 *
 * It only uses Node built-ins + the `convex` CLI already in the workspace.
 *
 * Usage:
 *   node scripts/import-notion.mjs \
 *     --csv ./export.csv \
 *     --photos ./attachments \
 *     --horario ./horario-map.json \
 *     [--out ./import-credentials.local.json] [--prod] [--dry-run]
 *
 * NEVER pass the real export in dev/preview. Passwords land in --out, which is
 * git-ignored (packages/backend/.gitignore) — keep it out of the repo.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

function parseArgs(argv) {
  const args = { out: "import-credentials.local.json", prod: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--csv") args.csv = argv[++i];
    else if (a === "--photos") args.photos = argv[++i];
    else if (a === "--horario") args.horario = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--prod") args.prod = true;
    else if (a === "--dry-run") args.dryRun = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.csv) throw new Error("--csv <path> is required");
  if (!args.horario) throw new Error("--horario <path> is required");
  return args;
}

/** Run a Convex function and return its parsed JSON result. */
function convexRun(fn, payload, { prod }) {
  const cmd = ["convex", "run", fn, JSON.stringify(payload)];
  if (prod) cmd.push("--prod");
  const stdout = execFileSync(NPX, cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  // `convex run` prints the return value as JSON; extract the JSON block.
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`Unexpected output from ${fn}:\n${stdout}`);
  return JSON.parse(stdout.slice(start, end + 1));
}

/** Upload one file to Convex storage, returning its storage id. */
async function uploadPhoto(uploadUrl, filePath) {
  const bytes = readFileSync(filePath);
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": guessType(filePath) },
    body: bytes,
  });
  if (!res.ok) throw new Error(`Upload failed for ${filePath}: ${res.status}`);
  const { storageId } = await res.json();
  return storageId;
}

function guessType(filePath) {
  const ext = filePath.toLowerCase().split(".").pop();
  return ext === "png" ? "image/png"
    : ext === "webp" ? "image/webp"
    : ext === "gif" ? "image/gif"
    : "image/jpeg";
}

/** Locate a referenced attachment by filename, anywhere under the photos dir. */
function findPhoto(photosDir, filename) {
  const direct = join(photosDir, filename);
  if (existsSync(direct)) return direct;
  const wanted = basename(filename).toLowerCase();
  const stack = [photosDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name.toLowerCase() === wanted) return full;
    }
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const csv = readFileSync(resolve(args.csv), "utf8");
  const horarioMap = JSON.parse(readFileSync(resolve(args.horario), "utf8"));

  // 1 + 2. Dry-run validation. Stop on any hard failure BEFORE writing/uploading.
  console.log("→ Validating…");
  const { report, fiches } = convexRun("notionImport:validate", { csv, horarioMap }, args);
  printReport(report);
  if (!report.ok) {
    console.error("\n✗ Duplicate Correo(s) — clean the CSV and re-run. Nothing was written.");
    process.exit(1);
  }
  if (args.dryRun) {
    console.log("\n(dry run — no write requested)");
    return;
  }

  // 3. Upload photos per importable row (in order).
  const photosByEmail = {};
  if (args.photos) {
    const photosDir = resolve(args.photos);
    for (const fiche of fiches) {
      const ids = [];
      for (const filename of fiche.photoFilenames) {
        const filePath = findPhoto(photosDir, filename);
        if (!filePath) {
          console.warn(`  ! photo not found for ${fiche.correo}: ${filename} (skipped)`);
          continue;
        }
        const url = convexRun("storage:generateUploadUrl", {}, args);
        // generateUploadUrl returns a bare string, wrapped by convexRun's JSON scan
        // into an object only when it is one; handle the string case explicitly.
        const uploadUrl = typeof url === "string" ? url : url.url ?? url;
        ids.push(await uploadPhoto(uploadUrl, filePath));
      }
      if (ids.length) photosByEmail[fiche.correo] = ids;
    }
  }

  // 4. Real import.
  console.log("→ Importing…");
  const result = convexRun("notionImport:importFromNotion", { csv, horarioMap, photosByEmail }, args);
  writeFileSync(resolve(args.out), JSON.stringify(result.credentials, null, 2), "utf8");
  console.log(`✓ Created ${result.created.length} account(s), skipped ${result.skipped.length} existing.`);
  console.log(`✓ Passwords written to ${args.out} (git-ignored — hand off by WhatsApp, then delete).`);
}

function printReport(report) {
  const line = (label, arr) => arr.length && console.log(`  ${label}: ${arr.length}`);
  console.log(`  rows: ${report.totalRows} · importable: ${report.importable}`);
  line("duplicate Correo", report.duplicateCorreos);
  line("rows without Correo (ignored)", report.rowsWithoutCorreo);
  line("invalid WhatsApp (skipped)", report.invalidWhatsapp);
  line("invalid ¿Resides? (skipped)", report.invalidResides);
  line("unknown Categoría (skipped)", report.unknownCategory);
  line("sub-categories dropped (not Comida)", report.droppedSubcategories);
  line("unmapped Horario (imported without hours)", report.unmappedHorario);
  line("unmapped Estado (defaulted to pendiente)", report.unmappedEstado);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});

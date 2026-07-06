import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  createSeededPasswordAccount,
  generateStrongPassword,
} from "./lib/auth/seededAccount";
import { commerceWriteFields, horarioValidator } from "./lib/commerce";
import { parseNotionCsv } from "./lib/import/csv";
import { buildImportPlan } from "./lib/import/plan";

/**
 * One-shot Notion import (PRD #1 §"Import initial", story #17). Internal
 * functions only — never exposed to the app; the operator runs them at recette
 * via `npx convex run` (see `docs/product/notion-import.md` and the CLI wrapper
 * `packages/backend/scripts/import-notion.mjs`).
 *
 * The whole pipeline is:
 *   1. Validation BEFORE any write (`validate`, dry-run): duplicate `Correo`
 *      aborts with a report; rows without `Correo` are ignored and listed;
 *      invalid WhatsApp / ¿Resides? / Categoría are flagged and skipped.
 *   2. Normalization (`lib/import/plan`): sub-categories dropped outside Comida,
 *      free-text Horario resolved through a manually-prepared correspondence
 *      table, Estado mapped, `PDF (portafolio)` ignored.
 *   3. Write (`importFromNotion`): seed one `entreprise` account per row (with a
 *      generated, hashed, single-use password returned ONCE to the caller for
 *      manual WhatsApp hand-off — never persisted in clear, never emailed),
 *      create its Commerce 1:1, and attach the pre-uploaded photos in order.
 *   4. Safeties: an anti-double-run guard (a row whose Correo already has an
 *      account is skipped, so re-running duplicates nothing) and NO email.
 *
 * Photos are uploaded to Convex storage by the CLI wrapper (via the existing
 * `storage.generateUploadUrl`), which passes their ordered storage ids here in
 * `photosByEmail`, keyed by the row's lowercased Correo.
 */

const horarioMapValidator = v.array(
  v.object({ raw: v.string(), horario: horarioValidator }),
);

/**
 * Dry-run validation: parse + plan the CSV WITHOUT writing anything. Returns the
 * report (duplicates, ignored rows, per-row flags, normalization notes) and the
 * importable rows' emails + ordered photo filenames, so the CLI knows which
 * attachments to upload before the real run.
 */
export const validate = internalQuery({
  args: {
    csv: v.string(),
    horarioMap: horarioMapValidator,
  },
  handler: (_ctx, args) => {
    const { report, fiches } = buildImportPlan(
      parseNotionCsv(args.csv),
      args.horarioMap,
    );
    return {
      report,
      fiches: fiches.map((f) => ({
        correo: f.correo,
        name: f.form.name,
        estado: f.estado,
        photoFilenames: f.photoFilenames,
      })),
    };
  },
});

/**
 * Write the import. Re-runs the plan as the authoritative guard: on a duplicate
 * `Correo` it returns `{ ok: false, report }` and writes NOTHING. Otherwise it
 * seeds each importable row, skipping any Correo that already has an account
 * (anti-double-run), and returns the generated credentials so the CLI can write
 * them to a local, git-ignored file for manual WhatsApp hand-off.
 */
export const importFromNotion = internalMutation({
  args: {
    csv: v.string(),
    horarioMap: horarioMapValidator,
    // Ordered storage ids per row, keyed by the row's lowercased Correo.
    photosByEmail: v.optional(
      v.record(v.string(), v.array(v.id("_storage"))),
    ),
  },
  handler: async (ctx, args) => {
    const { report, fiches } = buildImportPlan(
      parseNotionCsv(args.csv),
      args.horarioMap,
    );

    if (!report.ok) {
      return {
        ok: false as const,
        report,
        created: [] as string[],
        skipped: [] as string[],
        credentials: [] as { email: string; password: string }[],
      };
    }

    const photos = args.photosByEmail ?? {};
    const created: string[] = [];
    const skipped: string[] = [];
    const credentials: { email: string; password: string }[] = [];

    for (const fiche of fiches) {
      const email = fiche.correo; // already lowercased by the plan

      // Anti-double-run: an account already exists for this Correo → skip it,
      // so re-running the import on an already-seeded base duplicates nothing.
      const existing = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .first();
      if (existing) {
        skipped.push(email);
        continue;
      }

      const password = generateStrongPassword();
      const ownerId = await createSeededPasswordAccount(ctx, {
        email,
        name: fiche.form.contactName,
        password,
        role: "entreprise",
      });

      await ctx.db.insert("commerces", {
        ...commerceWriteFields(fiche.form),
        photos: photos[email] ?? [],
        estado: fiche.estado,
        ownerId,
      });

      created.push(email);
      credentials.push({ email, password });
    }

    return { ok: true as const, report, created, skipped, credentials };
  },
});

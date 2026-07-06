# Import Notion (one-shot) — guide opérateur

Ce guide explique comment remplir l'annuaire au lancement à partir de l'export
Notion (CSV + dossier de pièces jointes). L'import est **one-shot** : on le lance
une fois à la recette, puis la plateforme vit sans dépendance au développeur.

Le contrat de format du CSV est décrit dans
[`notion-csv-format.md`](./notion-csv-format.md). Le code vit dans
`packages/backend` (fonctions internes + wrapper CLI + fixture de test).

> ⚠️ **Données réelles = recette uniquement.** Le vrai export ne doit **jamais**
> entrer dans le repo ni dans un environnement de dev/preview. Le développement
> et les tests utilisent une fixture 100 % inventée
> (`packages/backend/convex/lib/import/fixtures/notion-export.fixture.csv`).

## Entrées attendues

1. **Le CSV Notion** (`export.csv`) — export « CSV & fichiers ». Garde le BOM et
   les en-têtes exacts (dont les espaces finaux de `Subcategoría ` et `Notas `).
2. **Le dossier de pièces jointes** (`./attachments`) — les fichiers image
   référencés par la colonne `Fotos`. Les `PDF (portafolio)` sont ignorés (hors
   scope v1).
3. **La table de correspondance Horario** (`horario-map.json`) — préparée
   **manuellement** avec l'opérateur : elle traduit chaque texte libre `Horario`
   du CSV en Horario structuré. Format (exemple dans
   `.../fixtures/notion-horario-map.fixture.json`) :

   ```json
   [
     { "raw": "Lunes a viernes de 8:00 a 16:00",
       "horario": { "mode": "plages", "days": "Lun – Vie", "from": 480, "to": 960 } },
     { "raw": "Con cita previa",
       "horario": { "mode": "disponible", "label": "con cita previa" } }
   ]
   ```

   `from`/`to` sont en **minutes depuis minuit** (8:00 = 480). Un texte non
   présent dans la table est signalé dans le rapport et la fiche est importée
   **sans horaire** (à compléter ensuite).

## Étapes

Le pipeline valide **avant toute écriture**, normalise, puis écrit.

### 1. Valider (dry-run, aucune écriture)

Depuis `packages/backend/` :

```bash
node scripts/import-notion.mjs \
  --csv ./export.csv \
  --photos ./attachments \
  --horario ./horario-map.json \
  --dry-run
```

Le wrapper appelle la fonction interne `notionImport:validate` et affiche le
**rapport**. Rien n'est écrit.

### 2. Importer

Retire `--dry-run` pour lancer l'import réel :

```bash
node scripts/import-notion.mjs \
  --csv ./export.csv \
  --photos ./attachments \
  --horario ./horario-map.json \
  --out ./import-credentials.local.json
# ajoute --prod pour cibler la production
```

Le wrapper : (1) revalide, (2) téléverse les photos dans l'ordre, (3) crée les
comptes seedés + fiches, (4) écrit les mots de passe générés dans `--out`.

### Alternative sans wrapper

Les fonctions internes sont exécutables directement (photos non gérées) :

```bash
npx convex run notionImport:validate       '{"csv": "...", "horarioMap": [...]}'
npx convex run notionImport:importFromNotion '{"csv": "...", "horarioMap": [...], "photosByEmail": {...}}'
```

## Ce que fait la normalisation

- **Sous-catégories** ignorées hors `Comida y bebida`.
- **`Horario`** : texte libre → Horario structuré via la table de correspondance.
- **`Estado`** : `Pendiente` → `pendiente` ; `Aprobado` et `Publicado` →
  `publicado`. Une valeur inconnue/vide est mise à `pendiente` (invisible au
  public, état sûr) et signalée.
- **`PDF (portafolio)`** ignoré.
- **WhatsApp** normalisé à 10 chiffres (le `+57` et les espaces sont retirés).

## Lire le rapport

| Ligne du rapport | Signification | Action |
| --- | --- | --- |
| `duplicate Correo` | Doublons d'email détectés | **Échec total, zéro écriture.** Nettoie le CSV (un seul Correo par commerce) et relance. |
| `rows without Correo (ignored)` | Lignes sans email | Ignorées (impossible de créer un compte). Elles repasseront par l'inscription normale. |
| `invalid WhatsApp (skipped)` | Numéro non ramenable à 10 chiffres | Ligne non importée. Corrige le numéro et relance pour ces lignes. |
| `invalid ¿Resides?` | Valeur hors des 3 attendues | Ligne non importée. Corrige la valeur. |
| `unknown Categoría` | Catégorie hors taxonomie partagée | Ligne non importée. Corrige la catégorie. |
| `sub-categories dropped` | Sous-catégorie hors Comida | Info : la fiche est importée sans sous-catégorie. |
| `unmapped Horario` | Texte absent de la table | Info : fiche importée sans horaire. Ajoute l'entrée à `horario-map.json`. |
| `unmapped Estado` | Estado inconnu/vide | Info : mis à `pendiente`. |

## Sécurités

- **Aucun email** n'est envoyé pendant l'import. Les identifiants se remettent
  **manuellement par WhatsApp**.
- **Mots de passe hors repo** : le fichier `--out`
  (`import-credentials*.json`) est git-ignoré. Remets les identifiants, puis
  **supprime le fichier**.
- **Anti-double-exécution** : relancer l'import sur une base déjà importée ne
  duplique rien — toute ligne dont le `Correo` a déjà un compte est **ignorée**
  (`skipped`). Tu peux donc corriger le CSV et relancer sans risque de doublon.

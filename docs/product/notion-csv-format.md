# Format de l'export CSV Notion (contrat d'import)

Référence pour le script d'import et pour la mock data de développement. **Les données réelles de l'export ne doivent jamais entrer dans le repo ni dans un environnement de dev/preview** — seul ce format (en-têtes) fait foi. Le vrai CSV n'est utilisé qu'à la recette, par l'opérateur.

## Ligne d'en-têtes exacte

```csv
Created time,Nombre del negocio,Descripción,Categoría,"Subcategoría ",WhatsApp,Nombre de contacto,Correo,Instagram / redes,Horario,PDF (portafolio),Fotos,¿Resides en Monteazul?,Torre y apartamento,"Notas ",Estado
```

## Pièges connus

- Le fichier commence par un **BOM UTF-8** (`﻿`) — à strip avant de parser la première colonne.
- Les colonnes `Subcategoría ` et `Notas ` ont un **espace final** dans leur nom (et sont donc quotées dans l'en-tête). Le parseur doit matcher les noms exacts ou les trimmer explicitement.
- `Fotos` et `PDF (portafolio)` contiennent des références aux pièces jointes du dossier d'export Notion (l'export « CSV & fichiers » produit un dossier de fichiers à côté du CSV).

## Correspondance avec le modèle Commerce

| Colonne CSV | Champ | Règle |
| --- | --- | --- |
| Created time | date d'inscription | informatif |
| Nombre del negocio | nom | requis |
| Descripción | description | requis |
| Categoría | catégorie | doit matcher une constante partagée |
| Subcategoría␣ | sous-catégories | **ignorée si catégorie ≠ Comida y bebida** |
| WhatsApp | whatsapp | 10 chiffres, sans +57 ni espaces |
| Nombre de contacto | nom de contact | optionnel |
| Correo | email du compte seedé | **ligne ignorée (et listée au rapport) si vide** ; doublon ⇒ échec de l'import avec rapport |
| Instagram / redes | instagram | optionnel |
| Horario | horario | texte libre → structuré via table de correspondance manuelle |
| PDF (portafolio) | — | **ignoré (hors scope v1)** |
| Fotos | photos | upload vers Convex storage, ordre conservé |
| ¿Resides en Monteazul? | resides | 3 valeurs : Resido en Monteazul / Resido cerca de la zona / No resido cerca de la zona |
| Torre y apartamento | torre/apto | texte libre |
| Notas␣ | notas | interne, jamais public |
| Estado | estado | Pendiente → `pendiente` ; Aprobado et Publicado → `publicado` |

## Fixture de développement

Un CSV de **données 100 % inventées** respectant ce format exact (BOM et espaces d'en-têtes inclus) est versionné dans le repo pour développer et tester l'import. Emails fictifs en `@example.com` uniquement — aucun envoi d'email, jamais d'adresse réelle hors production.

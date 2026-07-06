# Design — Annuaire public (apps/web)

## Source de vérité

- **Projet Claude Design** : https://claude.ai/design/p/14755a91-a153-4673-b953-e53dee7576c2?file=Directorio+Monteazul.dc.html
- **Handoff local** : [design/Directorio Monteazul.dc.html](design/Directorio%20Monteazul.dc.html) — fichier principal, à reproduire **fidèlement** dans `apps/web`. `Listing Directions.dc.html` contient les directions exploratoires (référence secondaire).
- Le design ne concerne que l'app publique. **`apps/admin` n'a pas de design spécifique** (dashboard shadcn classique du template).
- Première étape d'implémentation front : **configurer le design system shadcn/Tailwind** avec les tokens ci-dessous.

## Écrans couverts

1. **Liste** : header sticky (logo Monteazul + avatar compte), barre de recherche « Buscar negocios o categorías… », chips catégories horizontales (icône + couleur par catégorie), sections par catégorie en scroll horizontal, cartes commerce (photo, badge Abierto/Cerrado/Disponible, cœur favori, nom, sous-catégorie, statut horaire, bouton WhatsApp), état « Sin resultados ».
2. **Détail** : carrousel photos avec dots, retour + cœur, pill sous-catégorie, badge ouverture, nom, localisation (« Torre 4 · Apto 926 »), description, carte Horario, « Redes y contacto » (Instagram, téléphone), CTA sticky « Escribir por WhatsApp ».
3. **Toast** de redirection WhatsApp (« Redirigiendo a WhatsApp de X… »).

## Tokens

| Token | Valeur |
| --- | --- |
| Font | Geist (400–700), Geist Mono pour labels techniques |
| Fond page | `#e7eaef` ; surface `#fff` ; conteneur max-width 480px centré |
| Primaire (navy) | `#1C2E4A` (pastel associé `#EEF1F6`) |
| WhatsApp (CTA) | `#25a35a` |
| Texte | `#111827` / `#374151` / `#6b7280` / `#9aa1ac` |
| Bordures | `#ECECEE` / `#E4E4E7` |
| « Ouvert » | dot `#22c55e`, texte `#1a7f45` ; « fermé » : dot `#c4c9d1`, texte `#9aa1ac` |
| Radius | boutons 9–13px, cartes 14px, chips 16px, pills 999px |

### Couleurs par catégorie (chips)

| Catégorie | Couleur | Pastel |
| --- | --- | --- |
| Todos | `#1C2E4A` | `#EEF1F6` |
| Comida y bebida | `#E07B39` | `#FBEEE3` |
| Mascotas | `#0E9E8E` | `#E0F2EF` |
| Belleza y cuidado personal | `#C85BA0` | `#F7E7F1` |
| Salud y bienestar | `#2E9E5B` | `#E4F4EA` |
| Accesorios y ropa | `#5B62D6` | `#E8E9FB` |
| Hogar y artesanías | `#C2922B` | `#F6EEDA` |
| Tecnología | `#3D7FD1` | `#E4EEFA` |

## Langue de l'UI

Espagnol (public colombien). Tous les libellés du design sont en espagnol.

## Comportements notables du prototype

- Le badge Abierto/Cerrado est **calculé en temps réel** à partir d'horaires structurés (`from`/`to` en minutes + jours), avec un mode spécial « Disponible » (con cita previa / sobre pedido).
- La recherche matche nom, catégorie, sous-catégorie et un champ `tag` (mot-clé court par commerce).
- Le clic WhatsApp affiche un toast puis ouvre `wa.me` — dans l'app réelle, l'événement est tracké côté serveur avant la redirection.
- Le cœur favori est présent sur les cartes et le détail (anonyme → inviter à se connecter).

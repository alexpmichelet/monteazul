# Spécifications — Annuaire des Entrepreneurs Monteazul

Document technique. Il décrit uniquement ce qui doit être construit. Les informations des commerces sont recueillies via un formulaire Notion (base de données déjà alimentée par de vraies réponses), qui sert de source de données initiale.

> Remarque : les noms réels des colonnes dans Notion sont en espagnol (indiqués entre parenthèses).

## 1. Ce qui doit être construit

Un annuaire web **mobile-first** de commerces, avec :

- Liste des commerces organisés par catégories (et sous-catégories pour l'Alimentation).
- Fiche individuelle par commerce avec description, galerie d'images et PDF optionnel.
- Bouton de contact direct par WhatsApp (click-to-chat) avec comptage des clics.
- Moteur de recherche par nom/mot-clé et filtres par catégorie.
- Comptes utilisateurs avec connexion (login) pour que chaque entrepreneur gère sa propre fiche.
- Statistiques par entrepreneur (visites et clics WhatsApp).
- Panneau d'administration pour approuver, modifier ou retirer des commerces.

**Priorité** : mobile-first (la plupart accèdent depuis leur téléphone), chargement rapide et optimisation des images.

## 2. Modèle de données — Commerce

Champs tirés du formulaire réel en usage (Notion). Le nom exact de la colonne en espagnol figure entre parenthèses.

| Champ | Type | Obligatoire | Notes |
| --- | --- | --- | --- |
| Propriétaire / compte | relation utilisateur | Oui | Relie la fiche au compte qui la gère |
| Nom du commerce (Nombre del negocio) | texte | Oui | |
| Catégorie (Categoría) | sélection | Oui | Voir liste en section 3 |
| Sous-catégorie (Subcategoría) | sélection multiple | Non | Uniquement pour Alimentation |
| Description (Descripción) | texte long | Oui | Objectif ~200 caractères (non imposé à la source) |
| WhatsApp | téléphone | Oui | 10 chiffres, sans +57 ni espaces (ex : 3182173887) |
| Photos (Fotos) | fichiers (plusieurs) | Non | Fournies en pièces jointes du formulaire |
| PDF (portfolio) | fichier | Non | Menu ou catalogue |
| Horaire (Horario) | texte | Non | Ex : Sur commande, Lun-Ven 7h30–16h00 |
| Tour et appartement (Torre y apartamento) | texte | Non | Format libre (ex : Torre 4 apto 926) |
| Instagram / réseaux | URL | Non | |
| Nom du contact (Nombre de contacto) | texte | Non | |
| Courriel (Correo) | email | Non | Sert aussi à créer/gérer le compte |
| Réside à Monteazul ? (¿Resides en Monteazul?) | sélection | Oui | Valeurs : Resido en Monteazul / Resido cerca de la zona / No resido cerca de la zona |
| Statut (Estado) | sélection | Oui (interne) | Pendiente / Aprobado / Publicado — contrôle l'affichage |
| Notes (Notas) | texte long | Non | Info supplémentaire (moyens de paiement, zones, etc.) |
| Visites de la fiche | nombre | Automatique | Tracking |
| Clics WhatsApp | nombre | Automatique | Tracking |
| Date d'inscription | date | Automatique | Created time |

**Note d'hygiène des données** : à la source, *Tour et appartement* est en format libre et certaines fiches hors alimentation portent la sous-catégorie *Otros*. Il convient de normaliser à l'import (ignorer la sous-catégorie quand la catégorie n'est pas Alimentation).

Il existe en outre une table utilisateurs/comptes (gérée par le système d'authentification) : courriel, mot de passe chiffré, nom, rôle (entrepreneur/administrateur) et date d'inscription. Chaque commerce est relié à un utilisateur via le champ *Propriétaire / compte*.

## 3. Catégories et sous-catégories

Les libellés des options ci-dessous sont les valeurs réelles (en espagnol) de la base Notion.

**Catégories** (champ *Categoría*) :

Comida y bebida · Mascotas · Belleza y cuidado personal · Salud y bienestar · Accesorios y ropa · Hogar y artesanías · Tecnología · Inmuebles y servicios · Otro

**Sous-catégories** (uniquement pour *Comida y bebida*, sélection multiple) :

Almuerzos y comida típica · Panadería y repostería · Carnes y embutidos · Frutas y mercado · Snacks y saludables · Helados y postres · Otros

## 4. Contact par WhatsApp (click-to-chat + tracking)

Le bouton de contact utilise le lien standard de WhatsApp :

```
https://wa.me/57XXXXXXXXXX
```

`57` = indicatif de la Colombie ; `XXXXXXXXXX` = les 10 chiffres enregistrés. Avec message prérempli optionnel :

```
https://wa.me/573182173887?text=Hola,%20te%20escribo%20desde%20el%20directorio%20de%20Monteazul
```

**Tracking des clics** : pour pouvoir compter les contacts, le bouton ne doit pas mener directement à wa.me. Il doit d'abord passer par le site (enregistrer l'événement) puis rediriger vers WhatsApp. C'est invisible pour l'utilisateur. On compte des événements (nombre de clics et de visites), et non des données personnelles des acheteurs.

## 5. Comptes utilisateurs, rôles et statistiques

La mise en œuvre de la connexion (login) sera convenue directement avec le développeur. On définit ici le comportement attendu.

### Rôles

- **Entrepreneur** — s'inscrit et se connecte, gère uniquement sa propre fiche et voit ses statistiques.
- **Administrateur** — approuve les nouveaux commerces, modifie ou retire n'importe quelle fiche, gère les catégories et voit les statistiques globales.
- **Visiteur (sans compte)** — navigue, recherche et contacte par WhatsApp ; sans inscription.

### Espace de l'entrepreneur

- Modifier sa fiche (textes, horaire, contact) à tout moment.
- Téléverser, changer et réordonner les images ; joindre/mettre à jour le PDF.
- Activer ou suspendre sa publication.
- Consulter ses statistiques.
- Récupérer le mot de passe par courriel.

### Statistiques par entrepreneur

- Visites de sa fiche.
- Clics sur *Écrire par WhatsApp*.
- Souhaitable : évolution dans le temps (semaine/mois).

### Panneau d'administration

- File d'approbation (fiches au statut *Pendiente*).
- Modifier/retirer n'importe quelle fiche ; gérer les catégories.
- Statistiques globales du site.

## 6. Source de données initiale

Les informations sont recueillies via un formulaire Notion dont la base de données s'exporte en CSV, avec les colonnes de la section 2 et les images/PDF en pièces jointes. Cet export est le point de départ pour alimenter le site. De vraies fiches sont déjà enregistrées.

## 7. Exigences non fonctionnelles

- Mobile-first et responsive.
- Chargement rapide ; optimisation/compression des images.
- Liens wa.me avec comptage des clics (section 4).
- La maintenance des commerces ne doit pas dépendre du développeur (faite par les entrepreneurs depuis leur compte et par l'admin depuis son panneau).

## 8. Décisions du grilling (2026-07-06)

Décisions actées lors de la session de grilling. Le vocabulaire canonique est dans `packages/backend/CONTEXT.md` ; la décision tracking est détaillée dans `docs/adr/0001-tracking-journal-evenements.md`.

### Rôles et comptes
- Rôles stockés : `user | entreprise | admin`. L'anonyme = absence de session (jamais une valeur en base). Un seul niveau d'admin.
- Le rôle `user` (public) sert **uniquement aux favoris** en v1 (enregistrer/retirer un commerce + écran « mes favoris »). Rien d'autre. Un anonyme qui clique le cœur est invité à se connecter.
- **1 compte `entreprise` = exactement 1 commerce** (strict). Le rôle est accordé dès la soumission de la fiche.
- Auth : Convex Auth, **Password (+ reset par email) et Google OAuth** uniquement. GitHub/Apple retirés. Le hashage plaintext placeholder du template doit être corrigé avant toute mise en prod.

### Cycle de vie de la fiche
- Estado : `pendiente` (soumise, invisible) → `publicado` (approuvée = en ligne) ⇄ `suspendido` (masquée volontairement, réactivable sans re-approbation). L'état Notion *Aprobado* est mappé sur `publicado` à l'import.
- Modération **a posteriori** : modifier une fiche publiée ne la repasse pas en approbation.
- Inscription post-lancement **in-app** (back-office) ; le formulaire Notion sort du circuit après l'import initial.

### Import initial (Notion CSV)
- **Seules les fiches avec Correo sont importées.** Comptes seedés (email + mot de passe généré), credentials transmis manuellement par WhatsApp. Les fiches sans email repasseront par l'inscription normale.
- Doublons d'email dans le CSV : le script échoue avec un rapport, nettoyage manuel du CSV, puis relance.
- Horaires texte libre normalisés à la main vers le format structuré pendant l'import.

### Apps
- `apps/web` = annuaire public (design Claude Design à reproduire fidèlement, voir `docs/product/design.md`) ; login `user` pour les favoris uniquement.
- `apps/admin` = back-office entrepreneurs + admins (dashboard shadcn du template, pas de design spécifique).
- `apps/native` = héritage du template, non utilisée, laissée dormante.
- Première étape front : configurer le design system shadcn/Tailwind avec les tokens du design.
- UI en **espagnol** sur les deux apps.

### Modèle de données — écarts vs formulaire Notion
- **Horario structuré** : plages (jours + ouverture/fermeture) OU mode spécial « Disponible » (sur commande / sur RDV). Le badge Abierto/Cerrado est calculé en temps réel.
- **PDF (portfolio) : hors scope v1.** Le champ n'est pas repris ; les PDF du CSV ne sont pas importés.
- Pas de champ tags/mots-clés : la recherche couvre nom, catégorie, sous-catégorie, description.
- Catégories et sous-catégories **fixes en constantes** (`@packages/shared`, avec icônes/couleurs du design). Pas de gestion des catégories dans le panneau admin en v1 (écart assumé avec la section 5).
- `¿Resides en Monteazul?` et `Notas` : données internes, visibles admin uniquement, jamais affichées publiquement.

### Tracking (fondamental — argument de monétisation)
- Journal d'événements horodatés, jamais de compteurs. Visite = visiteur unique / fiche / jour (dédup localStorage anonyme, self-visites exclues). Contact WhatsApp = clic brut, enregistré côté serveur avant redirection (rediriger même si l'enregistrement échoue).
- Stats entrepreneur : totaux + évolution jour/semaine/mois. Stats globales côté admin.

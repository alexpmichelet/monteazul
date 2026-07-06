# Backend — Annuaire des Entrepreneurs Monteazul

Contexte principal du produit : l'annuaire des commerces de la communauté Monteazul (Colombie). Backend Convex servant l'app publique (annuaire) et le back-office (entrepreneurs + admins).

## Language

### Rôles et acteurs

**Entrepreneur** :
Compte utilisateur portant le rôle stocké `entreprise` ; gère **exactement un** Commerce (relation 1:1 stricte) et consulte ses statistiques. Le rôle est accordé dès la soumission de la fiche, pas à son approbation.
_Avoid_ : entreprise (pour désigner la personne), commerçant, propriétaire

**Super admin** :
Compte utilisateur portant le rôle stocké `admin` ; approuve, modifie ou retire n'importe quelle fiche et voit les statistiques globales. Un seul niveau d'administration existe.
_Avoid_ : administrateur (ambigu), superadmin (en un mot)

**User** :
Compte utilisateur portant le rôle stocké `user` (rôle par défaut à l'inscription) ; un client qui cherche des commerces dans l'annuaire et peut enregistrer des favoris.
_Avoid_ : client, acheteur

**Visiteur** :
Personne sans session authentifiée. Navigue, recherche et contacte les commerces par WhatsApp — mais ne peut pas enregistrer de favoris. Ce n'est pas un rôle stocké — c'est l'absence de session.
_Avoid_ : anonyme (comme rôle en base)

### Annuaire

**Commerce** :
L'entité centrale de l'annuaire : un négoce tenu par un **Entrepreneur** (nom, catégorie, description, photos, WhatsApp…). Toujours rattaché à exactement un compte propriétaire. « Fiche » désigne sa page de détail publique — même entité, vue publique.
_Avoid_ : negocio (en code), business, listing

**Estado** :
Cycle de vie d'un **Commerce** : `pendiente` (soumis, invisible au public, en file d'approbation) → `publicado` (approuvé = en ligne) ⇄ `suspendido` (masqué volontairement par l'Entrepreneur ou le Super admin, réactivable sans nouvelle approbation). Modifier une fiche publiée ne la repasse pas en approbation (modération a posteriori).
_Avoid_ : statut, status, aprobado (artefact Notion — mappé sur `publicado` à l'import)

**Horario** :
Les heures d'activité d'un **Commerce**, structurées : soit des plages (jours + heure d'ouverture et de fermeture), soit un mode spécial « Disponible » (sur commande, sur rendez-vous). Permet de calculer l'état « Abierto / Cerrado / Disponible » en temps réel.
_Avoid_ : horaire en texte libre (format Notion, normalisé à l'import)

**Favori** :
Lien entre un **User** et un **Commerce** qu'il a enregistré. Seule capacité exclusive au rôle `user` en v1 (unique raison de créer un compte côté public).
_Avoid_ : bookmark, like

### Statistiques

**Visite** :
Un visiteur unique ayant ouvert la fiche d'un **Commerce** un jour donné (dédupliqué par identifiant anonyme, sans donnée personnelle). Les visites de l'**Entrepreneur** sur sa propre fiche sont exclues.
_Avoid_ : vue, page view, hit

**Contact WhatsApp** :
Un clic sur « Escribir por WhatsApp » — enregistré côté serveur avant la redirection vers `wa.me`. Non dédupliqué : chaque clic est une intention de contact. C'est la métrique de monétisation du produit.
_Avoid_ : clic (seul, ambigu), lead

**Événement** :
Entrée horodatée du journal de tracking (visite ou contact WhatsApp) rattachée à un **Commerce**. Les statistiques (totaux, séries jour/semaine/mois) sont des agrégations d'événements — jamais des compteurs incrémentés.

## Flagged ambiguities

- Les rôles stockés en base sont exactement `user | entreprise | admin` (décision du 2026-07-06). « Anonyme » n'est jamais une valeur en base.

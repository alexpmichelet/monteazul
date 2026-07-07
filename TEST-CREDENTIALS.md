# Credentials de test (dev)

> ⚠️ Comptes de **démonstration uniquement**, sur le déploiement Convex **dev**.
> Données 100 % inventées, adresses `@example.com`, aucun email réel. Ne jamais
> réutiliser ce mot de passe en production.

Tous les comptes partagent le même mot de passe : **`Monteazul2026!`**

| Rôle | Email | Où se connecter | Ce que ça débloque |
|------|-------|-----------------|--------------------|
| **Super admin** | `admin@example.com` | back-office `apps/admin` | file d'approbation, gestion de toutes les fiches, création de comptes seedés, stats globales |
| **Entrepreneur** | `entreprise@example.com` | back-office `apps/admin` | « Mi negocio » (fiche « Café Demo Monteazul » déjà publiée), édition, suspension/réactivation, stats de sa fiche |
| **Utilisateur** | `user@example.com` | annuaire public `apps/web` | favoris (cœurs + « Mis guardados ») |

## (Re)générer ces comptes

Seed rejouable — supprime puis recrée **exactement** ces 3 comptes (+ leurs credentials, sessions, favoris et fiche) :

```bash
cd packages/backend
npx convex run seedUsers:seedUsers
```

Pour peupler l'annuaire avec ~15 fiches de démo (données inventées) :

```bash
npx convex run seed:seedDev
```

## Notes

- Les comptes seedés sont **pré-vérifiés** : connexion directe au mot de passe, **aucun code OTP**.
- Pour un **nouveau** compte créé via l'inscription, le code de vérification n'est pas envoyé par email en dev (`IS_DEV=true`) — il apparaît dans les logs Convex :

  ```bash
  cd packages/backend
  npx convex logs
  # → [DEV] Verification code: 123456
  ```

- Pour tester le **wizard de soumission** d'une nouvelle fiche, crée un compte neuf : `entreprise@example.com` possède déjà une fiche (règle stricte 1 compte = 1 fiche).
- Un compte connecté par Google (sans mot de passe) ne fait pas partie de ces credentials — le sign-in Google est désactivé dans l'UI pour l'instant.

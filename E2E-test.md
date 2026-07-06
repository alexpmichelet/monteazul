# Tests E2E — validation finale

Registre des tests E2E manuels du projet. Chaque issue implémentée par un agent produit 2 à 3 tests E2E (proposés dans sa PR) ; l'agent orchestrateur les reporte ici, groupés par issue. Ces scénarios sont déroulés lors de la recette (#18).

Format par entrée :

```markdown
## #<numéro> — <titre de l'issue>

- [ ] <scénario E2E 1 : précondition → action → résultat observable>
- [ ] <scénario E2E 2>
```

<!-- Les entrées sont ajoutées ci-dessous par l'orchestrateur, dans l'ordre de merge. -->

## #2 — Design system shadcn/Tailwind pour apps/web (tokens du prototype)

- [ ] Ouvrir `/design-system` sur un viewport mobile (≤ 480px) → la page s'affiche centrée sur fond gris `#e7eaef`, sur une surface blanche max 480px, en police Geist ; toutes les sections de primitives sont visibles.
- [ ] Dans la section « Chips de categoría », toucher une chip (ex. « Comida ») → sa pastille passe au fond de couleur pleine de la catégorie avec icône blanche et libellé en gras, tandis que les autres chips restent au repos (pastel).
- [ ] Dans la section « Toast de redirección », cliquer « Mostrar toast de WhatsApp » → un toast navy avec l'icône WhatsApp et le texte « Redirigiendo a WhatsApp de Panadería El Trigal… » apparaît puis disparaît au bout de ~2,6 s.

## #3 — Rôles user|entreprise|admin, providers Password+Google, hashage réel des mots de passe

- [ ] **Inscription email/mot de passe (apps/web)** — Précondition : aucun compte pour `nuevo@example.com`. Action : `/signup` → email + mot de passe (≥8) → soumettre → saisir le code OTP reçu. Résultat : session ouverte, et le compte porte le rôle `user` par défaut.
- [ ] **Connexion Google (apps/web et apps/admin)** — Précondition : provider Google configuré côté déploiement. Action : sur `/login`, cliquer « Continue with Google » et compléter l'écran Google. Résultat : redirection vers l'app avec une session active ; aucun bouton GitHub/Apple visible.
- [ ] **Reset de mot de passe par email (apps/web)** — Précondition : compte existant `user@example.com`. Action : « Forgot your password? » → saisir l'email → entrer le code reçu → définir un nouveau mot de passe → se reconnecter. Résultat : reconnexion réussie avec le nouveau mot de passe (l'ancien est refusé, erreur affichée).

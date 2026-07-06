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

## #4 — Table commerces, module horario, seed mock et listing public

- [ ] **Listing publié uniquement** : lancer `npx convex run seed:seedDev` puis ouvrir `apps/web` (`/`) → les sections par catégorie s'affichent ; aucune fiche `pendiente` (« Snacks Verde Vida », « Trueques del Barrio ») ni `suspendido` (« Postres Dulce Monte ») n'apparaît.
- [ ] **Filtre par chip** : cliquer la chip « Comida » → seule la section « Comida y bebida » reste visible ; cliquer « Todos » → toutes les sections publiées reviennent.
- [ ] **Badge horario temps réel** : sur une carte en mode plages, le badge affiche « Abierto » avec « cierra a las HH:MM » pendant les heures d'ouverture (heure de Bogota) et « Cerrado · abre a las HH:MM » en dehors ; une fiche en mode disponible affiche « Disponible · sobre pedido / con cita previa ».

## #5 — Recherche full-text insensible aux accents

- [ ] **Recherche insensible aux accents/casse** — Précondition : annuaire seedé avec « Panadería El Trigal » (publicado). Action : taper `panaderia` (sans accent) dans la barre de recherche. Résultat : la fiche « Panadería El Trigal » apparaît dans les résultats.
- [ ] **Recherche combinée au chip catégorie** — Précondition : deux fiches publicado contenant le mot « artesanal », l'une en « Hogar y artesanías », l'autre en « Comida y bebida ». Action : sélectionner le chip « Hogar » puis taper `artesanal`. Résultat : seule la fiche « Hogar y artesanías » s'affiche.
- [ ] **État « Sin resultados » + effacement** — Précondition : annuaire chargé. Action : taper `zzzzz` (aucune correspondance). Résultat : l'écran affiche « Sin resultados » / « No encontramos negocios para «zzzzz». Prueba otra búsqueda o categoría. » ; cliquer le bouton d'effacement (X) de la barre restaure la liste complète.

## #6 — Fiche détail publique du commerce

- [ ] **Navigation liste → détail → retour** : depuis l'accueil, cliquer une carte d'un commerce publié → la fiche `/negocio/<id>` s'affiche (carrousel, badge, horaire, contact) → le bouton retour flottant ramène à la liste.
- [ ] **Fiche non publiée par URL directe → non trouvé** : ouvrir directement l'URL d'une fiche `pendiente` ou `suspendido` → page « Negocio no encontrado » avec lien « Volver al directorio » (jamais le contenu de la fiche).
- [ ] **Contact & réseaux** : sur une fiche publiée, le téléphone s'affiche « +57 318 217 3887 », le lien Instagram ouvre le profil, et « Escribir por WhatsApp » ouvre `wa.me/57…` avec le message pré-rempli.

## #7 — Contact WhatsApp tracké (journal d'événements)

- [ ] **Clic depuis une carte** — Précondition : annuaire avec un commerce publié « X » (WhatsApp 3182173887). Action : cliquer le bouton WhatsApp d'une carte. Résultat observable : toast « Redirigiendo a WhatsApp de X… », nouvel onglet vers `https://wa.me/573182173887?text=Hola%2C%20te%20escribo%20desde%20el%20directorio%20de%20Monteazul`, et un événement `whatsapp_click` pour X apparaît dans la table `events` (dashboard Convex). La carte ne navigue PAS vers la fiche.
- [ ] **N clics = N événements (non dédupliqué)** — Précondition : fiche détail de X. Action : cliquer « Escribir por WhatsApp » 3 fois. Résultat observable : 3 événements `whatsapp_click` distincts enregistrés pour X, et chaque clic redirige bien vers `wa.me`.
- [ ] **Le contact prime sur la stat** — Précondition : backend indisponible (hors-ligne / mutation en échec). Action : cliquer un bouton WhatsApp (carte ou CTA). Résultat observable : la redirection vers `wa.me` se produit quand même, le toast s'affiche, aucune erreur remontée à l'utilisateur.

## #8 — Tracking des visites (visiteur unique / fiche / jour)

- [ ] **Dédup même visiteur / même jour** : ouvrir une fiche `publicado` en navigation privée (nouveau visiteur), la recharger 3× → dans les stats du commerce, **1 seule Visite** pour aujourd'hui.
- [ ] **Exclusion du propriétaire** : se connecter comme l'Entrepreneur propriétaire, ouvrir SA fiche → **aucune Visite** ajoutée ; ouvrir la fiche d'un AUTRE commerce → **+1 Visite** sur cette autre fiche.
- [ ] **Bascule de jour (America/Bogota)** : ouvrir une fiche le jour J, puis le lendemain (après minuit heure Colombie) avec le même appareil/visiteur → **2 Visites** distinctes (J et J+1).

## #9 — Auth user et favoris sur l'annuaire public

- [ ] **Anonyme → invitation** : sans session, toucher le cœur d'une carte OU de la fiche → le dialog « Guarda tus negocios favoritos » s'ouvre, aucun favori créé ; ouvrir « Mis guardados » propose de se connecter.
- [ ] **Parcours complet** : Crear cuenta (email/mot de passe) → vérification → connecté, retour à l'accueil → cœur plein depuis une carte ET depuis la fiche → « Mis guardados » liste les deux → Cerrar sesión → les cœurs redeviennent vides.
- [ ] **Filtre `publicado`** : User ayant un favori dont la fiche passe en `suspendido` → la fiche disparaît de « Mis guardados » sans erreur ; toggler deux fois le même cœur ne crée jamais de doublon (paire user+commerce unique).

## #10 — Soumission de fiche entrepreneur et attribution du rôle entreprise

- [ ] **Inscription → soumission → Mi negocio** : précondition : aucun compte. Action : `/registro` (compte + login), remplir le wizard (catégorie « Comida y bebida » → cocher des sous-catégories, WhatsApp 10 chiffres, Horario « Por horas »), envoyer. Résultat observable : redirection vers `/mi-negocio` affichant la fiche avec le badge « Pendiente de aprobación », et la fiche n'apparaît PAS sur l'annuaire public.
- [ ] **Validation inline** : préconditions : sur le wizard. Action : saisir un WhatsApp de 9 chiffres (ou une sous-catégorie avec une catégorie ≠ Comida) et envoyer. Résultat observable : message d'erreur en espagnol affiché dans le formulaire, aucune fiche créée, rôle inchangé.
- [ ] **1:1 strict** : préconditions : un Entrepreneur ayant déjà soumis sa fiche, reconnecté via `/acceso`. Action : aller sur `/mi-negocio/nueva`. Résultat observable : redirection automatique vers `/mi-negocio` (pas de 2e soumission possible), la fiche existante reste affichée.

## #11 — Gestion des photos de la fiche (upload, ordre, suppression)

- [ ] **Upload + ordre + portada** — Précondition : Entrepreneur connecté avec sa fiche dans « Mi negocio ». Action : cliquer « Subir fotos », choisir 3 images, puis glisser-déposer la 3e en 1re position. Résultat observable : les 3 miniatures s'affichent, la nouvelle 1re porte le badge « Portada », et après rechargement l'ordre est conservé ; sur l'annuaire public la fiche (`publicado`) montre ce même ordre dans le carrousel et la 1re photo comme visuel de carte.
- [ ] **Validation type/taille** — Précondition : « Mi negocio ». Action : tenter de téléverser un PDF (ou une image > 5 Mo non compressible). Résultat observable : un toast d'erreur en espagnol s'affiche et aucune miniature n'est ajoutée.
- [ ] **Garde d'ownership** — Précondition : deux comptes Entrepreneur A et B, chacun avec sa fiche. Action : depuis le compte B, tenter une mutation photo sur la fiche de A (via l'API). Résultat observable : la mutation est refusée ; un Super admin, lui, peut modifier les photos de n'importe quelle fiche.

## #12 — File d'approbation et gestion des fiches par l'admin (machine à états Estado)

- [ ] **Approbation publie la fiche** : connecté en `admin`, ouvrir `/aprobacion` → la fiche `pendiente` apparaît avec ses champs internes (`¿Resides?`, `Notas`). Cliquer « Aprobar » → toast de succès, la fiche quitte la file ; sur l'annuaire public (`apps/web`) elle est désormais visible.
- [ ] **Suspension puis réactivation** : sur `/negocios`, filtrer par estado « Publicado », « Suspender » une fiche → elle passe `suspendido` et disparaît de l'annuaire public ; « Reactivar » → elle repasse `publicado` et réapparaît, sans re-passer par la file d'approbation.
- [ ] **Édition + suppression définitive** : ouvrir `/negocios/[id]`, modifier un champ avec un WhatsApp invalide → erreur inline (même validation que le formulaire entrepreneur) ; corriger et enregistrer → l'estado reste inchangé. « Eliminar » → dialog de confirmation, puis retrait définitif et retour à `/negocios`.

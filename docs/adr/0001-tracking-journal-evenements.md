# Tracking par journal d'événements, visites uniques par jour

Les statistiques (visites de fiche, contacts WhatsApp) sont l'argument de monétisation auprès des commerçants : leur crédibilité est un enjeu produit, pas un détail technique. On stocke donc un **journal d'événements horodatés** (jamais de compteurs incrémentés — un compteur perd l'historique et interdit les séries semaine/mois), avec ces définitions :

- **Visite** = un visiteur unique par fiche et par jour, dédupliqué par identifiant anonyme (localStorage, aucune donnée personnelle), en excluant les visites de l'entrepreneur sur sa propre fiche. On refuse les page views brutes : chiffres gonflés par les rechargements et les bots, indéfendables face à un commerçant payant.
- **Contact WhatsApp** = chaque clic sur le CTA, non dédupliqué (chaque clic est une intention réelle). L'événement est enregistré côté serveur **avant** la redirection vers `wa.me` ; si l'enregistrement échoue, on redirige quand même — le contact prime sur la stat.

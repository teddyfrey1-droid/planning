# Engagement Lab — Web Service (Render)

Objectif : **simulation pédagogique** (offline) d’un écosystème “growth platform” + “réseau social” fictif.
- Aucune interaction avec TikTok (ou autre) : **pas d’API externe, pas de scraping, pas de ciblage de handles réels**.
- Les “cibles” sont **uniquement** des comptes/vidéos **internes** au lab (sélection par liste).

## Déploiement Render (Web Service)
- Build: `npm install && npm run build`
- Start: `npm start`

## Local
```bash
npm install
npm run dev
```

## API (serveur)
- `GET /api/health`
- `GET /api/catalog` : comptes/vidéos internes (lecture)
- `POST /api/campaigns` : créer une campagne (service + target + amount)
- `GET /api/campaigns` : liste
- `GET /api/campaigns/:id` : détails

## Notes pédagogiques
- Cooldown “perks” simulé (par utilisateur/service)
- “Delivery” simulée (progression aléatoire, durées variables)
- UI inspirée de patterns de plateformes de “growth”, **sans reproduction à l’identique**.

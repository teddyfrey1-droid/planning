# FakeTokLab — Render Web Service (Express + Vite)

Ce repo est **100% offline / simulation** : aucune connexion à TikTok ou autre plateforme.

## Déploiement Render (Web Service)
1. Push ce repo sur GitHub
2. Render → New → **Web Service** → Connect repo
3. Settings :
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

Le serveur Express écoute sur `process.env.PORT` (compatible Render).

## Local
```bash
npm install
npm run dev
# puis ouvre http://localhost:5173
```

## Endpoints serveur
- `GET /api/health` → healthcheck

## Notes
- Tailwind config en `tailwind.config.cjs` pour éviter les problèmes ESM.
- Toute la logique du lab est côté client (simulation). Si tu veux du “prof-only”, on peut migrer une partie côté API.

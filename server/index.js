import express from "express";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(compression());

// Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// Vite build output
const distPath = path.resolve(__dirname, "..", "dist");
const indexHtml = path.join(distPath, "index.html");

if (!fs.existsSync(distPath)) {
  console.warn(
    "[WARN] dist/ introuvable. En prod, assure-toi que Render exécute `npm run build`."
  );
}

app.use(express.static(distPath, { maxAge: "1d", etag: true }));

// SPA fallback
app.get("*", (req, res) => {
  if (!fs.existsSync(indexHtml)) {
    res
      .status(500)
      .send("Build manquant: dist/index.html introuvable. Lance `npm run build`.");
    return;
  }
  res.sendFile(indexHtml);
});

// Render listens on process.env.PORT
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`FakeTokLab Web Service listening on port ${PORT}`);
});

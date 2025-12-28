import express from "express";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(compression());
app.use(express.json({ limit: "200kb" }));

// -------------------- Catalog (internal-only targets) --------------------
const seedTs = Date.now();
const catalog = {
  accounts: [
    { id: 1, username: "user_alice", followers: 1250, following: 180 },
    { id: 2, username: "user_bob", followers: 890, following: 220 },
    { id: 3, username: "target_account", followers: 5420, following: 35 }
  ],
  videos: [
    { id: 101, author: "target_account", title: "Ma première vidéo", views: 12500, likes: 890, shares: 44, durationSec: 18, createdAt: seedTs - 1000 * 60 * 60 * 24 * 10 },
    { id: 102, author: "target_account", title: "Tutoriel danse", views: 8900, likes: 654, shares: 33, durationSec: 24, createdAt: seedTs - 1000 * 60 * 60 * 24 * 2 },
    { id: 103, author: "user_alice", title: "Recette rapide 🍜", views: 4200, likes: 310, shares: 12, durationSec: 15, createdAt: seedTs - 1000 * 60 * 60 * 24 * 5 },
    { id: 104, author: "user_bob", title: "Astuce productivité ⏱️", views: 2500, likes: 220, shares: 9, durationSec: 20, createdAt: seedTs - 1000 * 60 * 60 * 24 * 1 }
  ]
};

let nextAccountId = Math.max(0, ...catalog.accounts.map(a => a.id)) + 1;
let nextVideoId = Math.max(0, ...catalog.videos.map(v => v.id)) + 1;

function sanitizeSimUsername(input) {
  const raw = String(input || "").trim().replace(/^@+/, "");
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9_\.]/g, "").slice(0, 20);
  if (!cleaned) return null;
  return cleaned.startsWith("sim_") ? cleaned : `sim_${cleaned}`;
}

function sanitizeTitle(input) {
  const t = String(input || "").trim();
  return t.slice(0, 60) || "Untitled";
}


// -------------------- Growth campaign simulation --------------------
const SERVICES = ["followers", "likes", "views", "shares"];
const AMOUNTS = {
  followers: [10, 25, 50, 100],
  likes: [20, 50, 100, 250],
  views: [100, 250, 500, 1000],
  shares: [5, 10, 25, 50]
};

// cooldown simulation ("new perks every 10 minutes") - kept configurable
const COOLDOWN_MS = 10 * 60 * 1000;

const state = {
  campaigns: new Map(), // id -> campaign
  cooldowns: new Map()  // key user|service -> ts when allowed
};

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function makeId(prefix = "cmp") {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function catalogHasAccount(username) {
  return catalog.accounts.some((a) => a.username === username);
}

function catalogHasVideoId(videoId) {
  return catalog.videos.some((v) => v.id === videoId);
}

function applyDelivery(c) {
  // Apply to internal catalog counters (simulation only)
  if (c.service === "followers") {
    const acc = catalog.accounts.find((a) => a.username === c.target.username);
    if (acc) acc.followers += c.lastDelta || 0;
  } else {
    const v = catalog.videos.find((x) => x.id === c.target.videoId);
    if (v) {
      if (c.service === "likes") v.likes += c.lastDelta || 0;
      if (c.service === "views") v.views += c.lastDelta || 0;
      if (c.service === "shares") v.shares += c.lastDelta || 0;
    }
  }
}

function scheduleCampaign(campaign) {
  // Delivery time: variable, can be "up to 24h" in UI; here compressed for demo.
  // We simulate variability with random step sizes + random intervals.
  const start = Date.now();
  campaign.status = "running";
  campaign.startedAt = start;
  campaign.logs.push({ ts: start, msg: "Campaign started (simulation)." });

  const interval = setInterval(() => {
    if (campaign.status !== "running") return;

    // Stop conditions
    if (campaign.delivered >= campaign.amount) {
      campaign.status = "completed";
      campaign.completedAt = Date.now();
      campaign.logs.push({ ts: campaign.completedAt, msg: "Campaign completed (simulation)." });
      clearInterval(interval);
      return;
    }

    // Step size: diminishing returns as it approaches the end
    const remaining = campaign.amount - campaign.delivered;
    const baseStep = campaign.service === "views" ? rand(10, 60) : rand(1, 12);
    const step = Math.max(1, Math.min(remaining, Math.round(baseStep * rand(0.6, 1.2))));

    campaign.lastDelta = step;
    campaign.delivered += step;
    campaign.updatedAt = Date.now();

    applyDelivery(campaign);

    // Log occasionally
    if (Math.random() < 0.35) {
      campaign.logs.push({
        ts: campaign.updatedAt,
        msg: `Delivered +${step} (${campaign.delivered}/${campaign.amount})`
      });
      campaign.logs = campaign.logs.slice(-60);
    }

    // Random throttling: simulate burst + quiet windows
    if (Math.random() < 0.08) {
      campaign.logs.push({ ts: Date.now(), msg: "Throttling window (simulation)..." });
    }
  }, 900);

  campaign._timer = interval;
}


// -------------------- Catalog management (simulation only) --------------------
app.post("/api/catalog/accounts", (req, res) => {
  const username = sanitizeSimUsername(req.body?.username);
  if (!username) return res.status(400).json({ ok: false, error: "bad_username" });
  if (catalogHasAccount(username)) return res.status(409).json({ ok: false, error: "exists" });

  const acc = {
    id: nextAccountId++,
    username,
    followers: Number(req.body?.followers ?? 0) || 0,
    following: Number(req.body?.following ?? 0) || 0
  };
  catalog.accounts.push(acc);
  res.json({ ok: true, account: acc });
});

app.post("/api/catalog/videos", (req, res) => {
  const author = sanitizeSimUsername(req.body?.author);
  if (!author) return res.status(400).json({ ok: false, error: "bad_author" });

  if (!catalogHasAccount(author)) {
    const acc = { id: nextAccountId++, username: author, followers: 0, following: 0 };
    catalog.accounts.push(acc);
  }

  const vid = {
    id: nextVideoId++,
    author,
    title: sanitizeTitle(req.body?.title),
    views: Number(req.body?.views ?? 0) || 0,
    likes: Number(req.body?.likes ?? 0) || 0,
    shares: Number(req.body?.shares ?? 0) || 0,
    durationSec: Math.max(5, Math.min(60, Number(req.body?.durationSec ?? 18) || 18)),
    createdAt: Date.now()
  };
  catalog.videos.push(vid);
  res.json({ ok: true, video: vid });
});


// -------------------- API --------------------
app.get("/api/health", (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.get("/api/catalog", (req, res) => {
  res.json({ ok: true, catalog });
});

// Increment internal engagement counters (simulation only; internal catalog targets)
app.post("/api/engagement", (req, res) => {
  const { action, videoId, username, delta } = req.body || {};
  const d = Number(delta || 1);

  if (action === "follow") {
    const u = String(username || "");
    const acc = catalog.accounts.find((a) => a.username === u);
    if (!acc) return res.status(400).json({ ok: false, error: "invalid_target_account" });
    acc.followers += Math.max(0, d);
    return res.json({ ok: true, catalog });
  }

  const vid = catalog.videos.find((v) => v.id === Number(videoId));
  if (!vid) return res.status(400).json({ ok: false, error: "invalid_target_video" });

  if (action === "view") vid.views += Math.max(0, d);
  else if (action === "like") vid.likes += Math.max(0, d);
  else if (action === "share") vid.shares += Math.max(0, d);
  else return res.status(400).json({ ok: false, error: "bad_action" });

  return res.json({ ok: true, catalog });
});


app.get("/api/campaigns", (req, res) => {
  const all = Array.from(state.campaigns.values())
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 200);
  res.json({ ok: true, campaigns: all });
});

app.get("/api/campaigns/:id", (req, res) => {
  const c = state.campaigns.get(req.params.id);
  if (!c) return res.status(404).json({ ok: false, error: "not_found" });
  res.json({ ok: true, campaign: c });
});

app.post("/api/campaigns", (req, res) => {
  const { actor = "anonymous", service, target, amount } = req.body || {};

  if (!SERVICES.includes(service)) {
    return res.status(400).json({ ok: false, error: "bad_service" });
  }

  const allowedAmounts = AMOUNTS[service] || [];
  if (!allowedAmounts.includes(Number(amount))) {
    return res.status(400).json({ ok: false, error: "bad_amount", allowed: allowedAmounts });
  }

  // Enforce internal-only targets
  if (service === "followers") {
    const username = String(target?.username || "");
    if (!catalogHasAccount(username)) {
      return res.status(400).json({ ok: false, error: "invalid_target_account" });
    }
  } else {
    const videoId = Number(target?.videoId);
    if (!catalogHasVideoId(videoId)) {
      return res.status(400).json({ ok: false, error: "invalid_target_video" });
    }
  }

  // Cooldown per actor/service
  const key = `${actor}|${service}`;
  const allowAt = state.cooldowns.get(key) || 0;
  const t = Date.now();
  if (t < allowAt) {
    return res.status(429).json({
      ok: false,
      error: "cooldown",
      retryAfterMs: allowAt - t
    });
  }
  state.cooldowns.set(key, t + COOLDOWN_MS);

  const id = makeId("cmp");
  const campaign = {
    id,
    actor,
    service,
    amount: Number(amount),
    delivered: 0,
    status: "queued",
    createdAt: t,
    updatedAt: t,
    startedAt: null,
    completedAt: null,
    target:
      service === "followers"
        ? { kind: "account", username: target.username }
        : { kind: "video", videoId: Number(target.videoId) },
    logs: [{ ts: t, msg: "Campaign queued (simulation)." }],
    lastDelta: 0
  };

  state.campaigns.set(id, campaign);

  // Start after small delay to mimic queueing
  setTimeout(() => scheduleCampaign(campaign), Math.round(rand(600, 1600)));

  res.json({ ok: true, campaign, cooldownMs: COOLDOWN_MS });
});


// -------------------- Interaction events (view/like/share) --------------------
app.post("/api/events", (req, res) => {
  const { actor = "anonymous", type, videoId } = req.body || {};
  const vid = Number(videoId);

  if (!["view", "like", "share"].includes(type)) {
    return res.status(400).json({ ok: false, error: "bad_event_type" });
  }
  if (!catalogHasVideoId(vid)) {
    return res.status(400).json({ ok: false, error: "invalid_video" });
  }

  const v = catalog.videos.find((x) => x.id === vid);
  if (!v) return res.status(400).json({ ok: false, error: "invalid_video" });

  if (type === "view") v.views += 1;
  if (type === "like") v.likes += 1;
  if (type === "share") v.shares += 1;

  const ts = Date.now();
  res.json({ ok: true, ts, actor, type, videoId: vid, snapshot: { views: v.views, likes: v.likes, shares: v.shares } });
});
// -------------------- Static hosting (Vite dist) --------------------
const distPath = path.resolve(__dirname, "..", "dist");
const indexHtml = path.join(distPath, "index.html");

app.use(express.static(distPath, { maxAge: "1d", etag: true }));

app.get("*", (req, res) => {
  if (!fs.existsSync(indexHtml)) {
    res.status(500).send("Build manquant: dist/index.html introuvable. Lance `npm run build`.");
    return;
  }
  res.sendFile(indexHtml);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Engagement Lab Web Service listening on port ${PORT}`);
});

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Shield,
  Mail,
  KeyRound,
  LogIn,
  LogOut,
  Users,
  Heart,
  Eye,
  MessageCircle,
  UserPlus,
  Trash2,
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Settings,
  Package,
  Timer,
  Activity
} from "lucide-react";

const LS = {
  MAIL_ACCOUNTS: "lab_mail_accounts_v5",
  USERS: "lab_users_v5",
  SESSION: "lab_session_v5",
  PROFILES: "lab_profiles_v5"
};

function safeParse(json, fallback) {
  try { const v = JSON.parse(json); return v ?? fallback; } catch { return fallback; }
}
function now() { return Date.now(); }
function fmtTime(ts) { return new Date(ts).toLocaleTimeString(); }
function normalizeEmail(email) { return String(email || "").trim().toLowerCase(); }
function isValidEmail(email) { const e = normalizeEmail(email); return e.includes("@") && e.includes("."); }
function otp6() { return String(Math.floor(100000 + Math.random() * 900000)); }

function bytesToB64(bytes) { let bin=""; bytes.forEach((b)=>bin+=String.fromCharCode(b)); return btoa(bin); }
function b64ToBytes(b64) { const bin=atob(b64); const arr=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); return arr; }

async function makeSaltB64() {
  if (!globalThis.crypto?.getRandomValues) return null;
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return bytesToB64(salt);
}

async function hashPasswordPBKDF2(password, saltB64, iterations = 120000) {
  if (!globalThis.crypto?.subtle) return null;
  const enc = new TextEncoder();
  const passKey = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
  const saltBytes = b64ToBytes(saltB64);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" }, passKey, 256);
  return bytesToB64(new Uint8Array(bits));
}

function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
function log1p(n){ return Math.log(1+Math.max(0,n)); }

async function apiJson(path, opts) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data?.ok !== false, status: res.status, data };
}


function TargetPicker({ placeholder, items, value, onChange, onPick, onCreate }) {
  const [open, setOpen] = React.useState(false);
  const [focusIdx, setFocusIdx] = React.useState(0);

  const q = String(value || "").trim().replace(/^@+/, "").replace(/^#/, "").toLowerCase();

  const filtered = React.useMemo(() => {
    if (!q) return items.slice(0, 8);
    return items
      .filter((it) => it.key.toLowerCase().includes(q) || it.label.toLowerCase().includes(q))
      .slice(0, 8);
  }, [q, items]);

  function commitPick(it) {
    setOpen(false);
    onPick(it.key);
  }

  function handleKeyDown(e) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) setOpen(true);
    if (!open) return;

    if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setFocusIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter") {
      e.preventDefault();
      const it = filtered[focusIdx];
      if (it) commitPick(it);
      else if (onCreate) onCreate(value);
    }
    if (e.key === "Escape") setOpen(false);
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setFocusIdx(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-3 py-2 rounded-lg border"
          placeholder={placeholder}
        />
        {onCreate && (
          <button
            type="button"
            onClick={() => onCreate(value)}
            className="px-3 py-2 rounded-lg border bg-gray-100 hover:bg-gray-200 font-semibold text-sm"
            title="Créer une cible démo interne"
          >
            + Demo
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-gray-600">
              Aucun match interne. Appuie sur <span className="font-semibold">Entrée</span> ou <span className="font-semibold">+ Demo</span> pour créer une cible démo.
            </div>
          ) : (
            filtered.map((it, i) => (
              <button
                type="button"
                key={it.key}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commitPick(it)}
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${i === focusIdx ? "bg-gray-50" : ""}`}
              >
                <div className="text-sm font-semibold">{it.label}</div>
                {it.sub && <div className="text-xs text-gray-500">{it.sub}</div>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}


export default function Lab() {
  const [tab, setTab] = useState("feed");

  // ------------------ Catalog fetched from server (internal-only) ------------------
  const [catalog, setCatalog] = useState({ accounts: [], videos: [] });
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  useEffect(() => {
    let mounted = true;

    async function pull() {
      const r = await apiJson("/api/catalog");
      if (!mounted) return;
      if (r.ok) setCatalog(r.data.catalog);
      setCatalogLoaded(true);
    }

    pull();
    const t = setInterval(pull, 1000); // refresh counters / deliveries
    return () => { mounted = false; clearInterval(t); };
  }, []);

  // ------------------ Mail provider sim (localStorage) ------------------
  const [mailAccounts, setMailAccounts] = useState(() => {
    const saved = safeParse(localStorage.getItem(LS.MAIL_ACCOUNTS), []);
    return Array.isArray(saved) ? saved : [];
  });
  useEffect(() => localStorage.setItem(LS.MAIL_ACCOUNTS, JSON.stringify(mailAccounts)), [mailAccounts]);

  const mailMap = useMemo(() => new Map(mailAccounts.map((a) => [a.email, a])), [mailAccounts]);

  const [mailCreate, setMailCreate] = useState({ localPart: "student1", domain: "labmail.local", password: "mail1234" });
  const [autoOtp, setAutoOtp] = useState(true);
  const [autoVerifyOtp, setAutoVerifyOtp] = useState(true);
  const [mailLogin, setMailLogin] = useState({ email: "student1@labmail.local", password: "mail1234" });
  const [mailSession, setMailSession] = useState(null); // { email }

  const [otpEmail, setOtpEmail] = useState("student1@labmail.local");
  const [otpInput, setOtpInput] = useState("");

  function createMailAccount() {
    const email = normalizeEmail(`${mailCreate.localPart}@${mailCreate.domain}`);
    const pass = String(mailCreate.password || "");
    if (!isValidEmail(email) || pass.length < 4) return;

    const code = otp6();
    const t = now();
    const msg = {
      id: "msg_" + Math.random().toString(36).slice(2),
      subject: "Lab — Code de vérification",
      body: `Votre code OTP est : ${code}
(Simulation offline)`,
      otp: code,
      sentAt: t
    };

    setMailAccounts((prev) => {
      if (prev.some((x) => x.email === email)) return prev;
      return [
        ...prev,
        {
          email,
          passwordPlain: pass,
          createdAt: t,
          inbox: autoOtp ? [msg] : [],
          verifiedAt: autoVerifyOtp && autoOtp ? t : null,
          lastOtpSentAt: autoOtp ? t : 0
        }
      ];
    });

    setMailLogin({ email, password: pass });
    setOtpEmail(email);

    if (autoOtp) {
      // Fill the OTP input automatically for the demo workflow
      setOtpInput(code);
    }
  }

  function loginMailbox() {
    const email = normalizeEmail(mailLogin.email);
    const pass = String(mailLogin.password || "");
    const acc = mailMap.get(email);
    if (!acc) return;
    if (acc.passwordPlain !== pass) return;
    setMailSession({ email });
  }
  function logoutMailbox() { setMailSession(null); }
  function deleteMailAccount(email) {
    const e = normalizeEmail(email);
    setMailAccounts((prev) => prev.filter((a) => a.email !== e));
    if (mailSession?.email === e) setMailSession(null);
  }

  function sendOtp() {
    const email = normalizeEmail(otpEmail);
    if (!isValidEmail(email)) return;

    const t = now();
    const code = otp6();
    const msg = {
      id: "msg_" + Math.random().toString(36).slice(2),
      subject: "Lab — Code de vérification",
      body: `Votre code OTP est : ${code}
(Simulation offline)`,
      otp: code,
      sentAt: t
    };

    setMailAccounts((prev) =>
      prev.map((mb) => {
        if (mb.email !== email) return mb;
        const since = t - (mb.lastOtpSentAt || 0);
        if (since < 20000) return mb; // 1 OTP / 20s
        return {
          ...mb,
          lastOtpSentAt: t,
          inbox: [msg, ...mb.inbox].slice(0, 30),
          verifiedAt: autoVerifyOtp ? t : null
        };
      })
    );

    if (autoOtp) setOtpInput(code);
  }

  function verifyOtp() {
    const email = normalizeEmail(otpEmail);
    const code = String(otpInput || "").trim();
    if (!code) return;
    const mb = mailMap.get(email);
    if (!mb) return;
    const lastOtp = mb.inbox.find((m) => m.otp)?.otp || null;
    if (!lastOtp) return;
    if (code !== lastOtp) return;
    setMailAccounts((prev) => prev.map((x) => (x.email === email ? { ...x, verifiedAt: now() } : x)));
  }

  function emailVerified(email) {
    const e = normalizeEmail(email);
    const mb = mailMap.get(e);
    return Boolean(mb?.verifiedAt);
  }

  function emailVerifiedBadge(email) {
    const ok = emailVerified(email);
    return (
      <span className={`text-xs px-2 py-1 rounded ${ok ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
        {ok ? "Vérifié" : "Non vérifié"}
      </span>
    );
  }

  // ------------------ Users + session (localStorage) ------------------
  const [users, setUsers] = useState(() => {
    const saved = safeParse(localStorage.getItem(LS.USERS), []);
    return Array.isArray(saved) ? saved : [];
  });
  useEffect(() => localStorage.setItem(LS.USERS, JSON.stringify(users)), [users]);

  const [session, setSession] = useState(() => safeParse(localStorage.getItem(LS.SESSION), null));
  useEffect(() => localStorage.setItem(LS.SESSION, JSON.stringify(session)), [session]);

  const currentUser = useMemo(() => {
    if (!session?.userId) return null;
    return users.find((u) => u.id === session.userId) || null;
  }, [session, users]);

  const cryptoAvailable = Boolean(globalThis.crypto?.subtle);

  const [signup, setSignup] = useState({ email: "student1@labmail.local", username: "student1", password: "demo1234" });
  const [login, setLogin] = useState({ email: "student1@labmail.local", password: "demo1234" });
  const [authBusy, setAuthBusy] = useState(false);

  async function doSignup() {
    const email = normalizeEmail(signup.email);
    const username = String(signup.username || "").trim();
    const password = String(signup.password || "");
    if (!isValidEmail(email) || !username || password.length < 4) return;
    if (!emailVerified(email)) return;
    if (users.some((u) => u.email === email)) return;
    if (users.some((u) => u.username === username)) return;

    setAuthBusy(true);
    try {
      const id = Math.max(0, ...users.map((u) => u.id)) + 1;
      const saltB64 = await makeSaltB64();
      const hashB64 = saltB64 ? await hashPasswordPBKDF2(password, saltB64) : null;
      const newUser = { id, email, username, createdAt: now(), saltB64: saltB64 || null, hashB64: hashB64 || null, passwordPlainFallback: hashB64 ? null : password };
      setUsers((prev) => [...prev, newUser]);
      setSession({ userId: id, loggedInAt: now() });
      setTab("feed");
    } finally {
      setAuthBusy(false);
    }
  }

  async function doLogin() {
    const email = normalizeEmail(login.email);
    const password = String(login.password || "");
    const u = users.find((x) => x.email === email);
    if (!u) return;

    setAuthBusy(true);
    try {
      if (u.hashB64 && u.saltB64) {
        const attempt = await hashPasswordPBKDF2(password, u.saltB64);
        if (attempt !== u.hashB64) return;
      } else {
        if (u.passwordPlainFallback !== password) return;
      }
      setSession({ userId: u.id, loggedInAt: now() });
      setTab("feed");
    } finally {
      setAuthBusy(false);
    }
  }

  function doLogout() { setSession(null); }

  // ------------------ Interest profiles (local) ------------------
  const [profiles, setProfiles] = useState(() => {
    const saved = safeParse(localStorage.getItem(LS.PROFILES), {});
    return saved && typeof saved === "object" ? saved : {};
  });
  useEffect(() => localStorage.setItem(LS.PROFILES, JSON.stringify(profiles)), [profiles]);

  function bumpProfileSignal({ username, tags = [], author, amount = 1 }) {
    if (!username) return;
    setProfiles((prev) => {
      const base = prev[username] || { tagWeights: {}, authorWeights: {} };
      const next = { tagWeights: { ...base.tagWeights }, authorWeights: { ...base.authorWeights } };
      for (const t of tags) next.tagWeights[t] = (next.tagWeights[t] || 0) + amount;
      if (author) next.authorWeights[author] = (next.authorWeights[author] || 0) + amount;
      return { ...prev, [username]: next };
    });
  }

  // ------------------ Feed simulation (based on catalog) ------------------
  const [mode, setMode] = useState("foryou");
  const [autoplay, setAutoplay] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [watchedMs, setWatchedMs] = useState(0);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [exploreEvery, setExploreEvery] = useState(6);

  const tickRef = useRef(null);
  const viewDedupRef = useRef(new Set()); // key: username|videoId

  const hasCountedViewRef = useRef(false);
  const viewCountedAtMsRef = useRef(null);

  const lastTickRef = useRef(null);
  const loopCountRef = useRef(0);

  const forYouFeed = useMemo(() => {
    const u = currentUser?.username;
    const prof = u ? profiles[u] : null;

    const scored = (catalog.videos || []).map((v) => {
      const pop = 0.6 * log1p(v.views) + 1.1 * log1p(v.likes) + 0.35 * log1p(v.shares || 0);
      const ageDays = (now() - (v.createdAt || now())) / (1000 * 60 * 60 * 24);
      const recency = 1 / (1 + 0.15 * ageDays);

      let aff = 0;
      if (prof) {
        const tags = v.tags || []; // tags optional
        for (const t of tags) aff += (prof.tagWeights?.[t] || 0) * 0.35;
        aff += (prof.authorWeights?.[v.author] || 0) * 0.55;
      }

      const score = pop * recency + aff;
      return { v, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const base = scored.map((x) => x.v);

    // Explore injection
    const pool = scored.slice(Math.floor(scored.length * 0.5)).map((x) => x.v);
    if (!pool.length || !exploreEvery || exploreEvery < 2) return base;

    const used = new Set(base.map((v) => v.id));
    const injected = [];
    let poolIdx = 0;

    for (let i = 0; i < base.length; i++) {
      injected.push(base[i]);
      const isSlot = (i + 1) % exploreEvery === 0 && i < base.length - 1;
      if (isSlot) {
        let candidate = null;
        for (let k = 0; k < pool.length; k++) {
          const vv = pool[(poolIdx + k) % pool.length];
          if (!used.has(vv.id)) { candidate = vv; poolIdx = (poolIdx + k + 1) % pool.length; break; }
        }
        if (candidate) { used.add(candidate.id); injected.push(candidate); }
      }
    }
    return injected;
  }, [catalog.videos, profiles, currentUser, exploreEvery]);

  const feed = useMemo(() => forYouFeed, [forYouFeed]);
  const activeVideo = useMemo(() => feed[activeIndex] || null, [feed, activeIndex]);
  const durationMs = (activeVideo?.durationSec || 15) * 1000;
  const completionPct = durationMs ? Math.round((watchedMs / durationMs) * 100) : 0;

  useEffect(() => {
    setWatchedMs(0);
    loopCountRef.current = 0;
    hasCountedViewRef.current = false;
    viewCountedAtMsRef.current = null;
    if (autoplay) { setIsPlaying(true); lastTickRef.current = now(); }
    else { setIsPlaying(false); lastTickRef.current = null; }
  }, [activeVideo?.id, autoplay]);

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    if (!isPlaying || !activeVideo) return;

    lastTickRef.current = now();
    tickRef.current = setInterval(() => {
      const t = now();
      const dt = t - (lastTickRef.current || t);
      lastTickRef.current = t;
      setWatchedMs((prev) => {
        const maxMs = (activeVideo.durationSec || 15) * 1000;
        return clamp(prev + dt, 0, maxMs);
      });
    }, 120);

    return () => { if (tickRef.current) clearInterval(tickRef.current); tickRef.current = null; };
  }, [isPlaying, activeVideo?.id]);

  function commitWatchSignal(reason) {
    if (!currentUser || !activeVideo) return;
    const dur = (activeVideo.durationSec || 15) * 1000;
    const completion = dur ? watchedMs / dur : 0;
    const countsAsView = watchedMs >= 2000;
    const isRewatch = loopCountRef.current > 0;
    const rewatchBoost = isRewatch ? 1 / (1 + loopCountRef.current) : 1;
    const amount = (countsAsView ? 0.8 + 1.8 * completion : 0.2) * (1 + 0.8 * rewatchBoost);
    bumpProfileSignal({ username: currentUser.username, tags: [], author: activeVideo.author, amount });
  }

  useEffect(() => {
    if (!activeVideo || !isPlaying) return;
    if (watchedMs < durationMs) return;

    setIsPlaying(false);
    commitWatchSignal("ended");

    if (loopEnabled) {
      loopCountRef.current += 1;
      setWatchedMs(0);
      hasCountedViewRef.current = false;
      viewCountedAtMsRef.current = null;
      if (autoplay) setTimeout(() => { setIsPlaying(true); lastTickRef.current = now(); }, 180);
      return;
    }
    if (autoplay) setTimeout(() => goNext(), 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedMs, activeVideo?.id, isPlaying, autoplay, loopEnabled]);

  // Count a "view" once per play when watch >= 2s (simulation)
  useEffect(() => {
    if (!activeVideo || !currentUser) return;
    if (!isPlaying) return;
    if (hasCountedViewRef.current) return;
    if (watchedMs < 2000) return;

    hasCountedViewRef.current = true;
    viewCountedAtMsRef.current = watchedMs;

    // Optimistic UI update (then server refresh will confirm)
    setCatalog((prev) => ({
      ...prev,
      videos: (prev.videos || []).map((v) => (v.id === activeVideo.id ? { ...v, views: (v.views || 0) + 1 } : v))
    }));

    apiJson("/api/engagement", {
      method: "POST",
      body: JSON.stringify({ action: "view", videoId: activeVideo.id, delta: 1 })
    }).catch(() => {});
  }, [watchedMs, isPlaying, activeVideo?.id, currentUser?.username]);


  function togglePlay() {
    if (!activeVideo || !currentUser) return;
    if (isPlaying) { setIsPlaying(false); commitWatchSignal("pause"); }
    else { setIsPlaying(true); lastTickRef.current = now(); }
  }
  function goNext() {
    if (!feed.length) return;
    if (isPlaying) { setIsPlaying(false); commitWatchSignal("swipe_next"); }
    else if (currentUser && activeVideo && watchedMs > 0) commitWatchSignal("swipe_next");
    setActiveIndex((i) => Math.min(i + 1, feed.length - 1));
  }
  function goPrev() {
    if (!feed.length) return;
    if (isPlaying) { setIsPlaying(false); commitWatchSignal("swipe_prev"); }
    else if (currentUser && activeVideo && watchedMs > 0) commitWatchSignal("swipe_prev");
    setActiveIndex((i) => Math.max(i - 1, 0));
  }

  
  // Count a view (server-side) once per user/video when watch >= 2s
  useEffect(() => {
    if (!currentUser || !activeVideo) return;
    if (watchedMs < 2000) return;
    const key = `${currentUser.username}|${activeVideo.id}`;
    if (viewDedupRef.current.has(key)) return;

    viewDedupRef.current.add(key);
    // Fire-and-forget; catalog polling will refresh counters shortly.
    apiJson("/api/events", { method: "POST", body: JSON.stringify({ actor: currentUser.username, type: "view", videoId: activeVideo.id }) });
  }, [watchedMs, currentUser?.username, activeVideo?.id]);

// ------------------ Growth platform simulation (server-backed) ------------------
  const [growthService, setGrowthService] = useState("followers");
  const [growthAmount, setGrowthAmount] = useState(25);
  const [targetAccount, setTargetAccount] = useState("target_account");
  const [targetVideoId, setTargetVideoId] = useState(101);

  const amountOptions = useMemo(() => {
    const map = {
      followers: [10, 25, 50, 100],
      likes: [20, 50, 100, 250],
      views: [100, 250, 500, 1000],
      shares: [5, 10, 25, 50]
    };
    return map[growthService] || [];
  }, [growthService]);

  useEffect(() => {
    const opts = amountOptions;
    if (!opts.includes(growthAmount) && opts.length) setGrowthAmount(opts[0]);
  }, [amountOptions]); // eslint-disable-line

  const [campaigns, setCampaigns] = useState([]);
  const [campaignError, setCampaignError] = useState(null);

  async function createDemoAccount(raw) {
    const username = String(raw || "").trim().replace(/^@+/, "");
    const r = await apiJson("/api/catalog/accounts", { method: "POST", body: JSON.stringify({ username }) });
    if (!r.ok) return null;
    return r.data.account;
  }

  async function createDemoVideo(raw) {
    const s = String(raw || "").trim();
    let title = s || "Démo vidéo";
    let author = "sim_student";
    if (s.includes("|")) {
      const parts = s.split("|");
      title = (parts[0] || title).trim();
      author = (parts[1] || author).trim().replace(/^@+/, "");
    }
    const r = await apiJson("/api/catalog/videos", { method: "POST", body: JSON.stringify({ title, author, durationSec: 18 }) });
    if (!r.ok) return null;
    return r.data.video;
  }

  async function refreshCampaigns() {
    const r = await apiJson("/api/campaigns");
    if (r.ok) setCampaigns(r.data.campaigns || []);
  }

  useEffect(() => {
    refreshCampaigns();
    const t = setInterval(refreshCampaigns, 1500);
    return () => clearInterval(t);
  }, []);

  async function startCampaign() {
    setCampaignError(null);
    if (!currentUser) { setCampaignError("Connecte-toi pour lancer une campagne."); return; }

    const payload = {
      actor: currentUser.username,
      service: growthService,
      amount: Number(growthAmount),
      target: growthService === "followers" ? { username: targetAccount } : { videoId: Number(targetVideoId) }
    };

    const r = await apiJson("/api/campaigns", { method: "POST", body: JSON.stringify(payload) });
    if (!r.ok) {
      const err = r.data?.error || "error";
      if (err === "cooldown") {
        const ms = r.data?.retryAfterMs ?? 0;
        setCampaignError(`Cooldown actif. Réessaie dans ~${Math.ceil(ms/1000)}s.`);
      } else {
        setCampaignError(`Erreur: ${err}`);
      }
      return;
    }
    await refreshCampaigns();
  }

  // ------------------ Reset (local only) ------------------
  function resetLocal() {
    localStorage.removeItem(LS.MAIL_ACCOUNTS);
    localStorage.removeItem(LS.USERS);
    localStorage.removeItem(LS.SESSION);
    localStorage.removeItem(LS.PROFILES);
    setMailAccounts([]);
    setUsers([]);
    setSession(null);
    setProfiles({});
    setMailSession(null);
    setTab("feed");
  }

  // ------------------ UI ------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Shield className="text-purple-600" />
                Engagement Lab — Simulation Offline (Web Service)
              </h1>
              <p className="text-gray-600 mt-2">
                Simule une “growth platform” + un mini-réseau social fictif. Cibles internes uniquement.
              </p>
              <div className="mt-2 text-xs text-gray-500">
                {cryptoAvailable ? "WebCrypto OK : mots de passe hashés (PBKDF2)." : "WebCrypto indisponible : fallback démo."}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {currentUser ? (
                <>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Connecté</div>
                    <div className="font-semibold">@{currentUser.username}</div>
                  </div>
                  <button onClick={doLogout} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition flex items-center gap-2">
                    <LogOut size={18} /> Déconnexion
                  </button>
                </>
              ) : (
                <button onClick={() => setTab("auth")} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2">
                  <LogIn size={18} /> Connexion / Signup
                </button>
              )}

              <button onClick={resetLocal} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2">
                <Trash2 size={18} /> Reset local
              </button>
            </div>
          </div>

          <div className="mt-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
            <div className="text-yellow-900 font-semibold">
              100% simulation : pas d’API externe, pas de ciblage de comptes réels, pas d’automatisation réelle.
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg">
          <div className="flex border-b">
            {[
              { k: "feed", label: "🎬 Feed (sim)" },
              { k: "growth", label: "📈 Growth Platform (sim)" },
              { k: "email", label: "📨 Mail + OTP (sim)" },
              { k: "auth", label: "🔐 Auth (sim)" }
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`flex-1 px-6 py-3 font-semibold transition ${tab === t.k ? "bg-purple-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* FEED */}
            {tab === "feed" && (
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                  <div className="bg-gray-900 rounded-2xl p-4 text-white relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-yellow-300" />
                        <div className="font-bold">For You</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-gray-200">
                          <Settings size={16} />
                          <input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} className="w-4 h-4" />
                          Autoplay
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-200">
                          <input type="checkbox" checked={loopEnabled} onChange={(e) => setLoopEnabled(e.target.checked)} className="w-4 h-4" />
                          Loop
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-200">
                          <span className="text-xs text-gray-300">Explore every</span>
                          <input type="number" min="2" max="20" value={exploreEvery}
                            onChange={(e) => setExploreEvery(parseInt(e.target.value || "6", 10))}
                            className="w-16 px-2 py-1 rounded bg-gray-700 text-white" />
                        </label>
                      </div>
                    </div>

                    <div className="mt-4 bg-gradient-to-b from-gray-800 to-black rounded-2xl p-6 min-h-[380px] flex flex-col justify-between">
                      {activeVideo ? (
                        <>
                          <div>
                            <div className="text-xs text-gray-300">@{activeVideo.author}</div>
                            <div className="text-2xl font-bold mt-1">{activeVideo.title}</div>
                            <div className="text-xs text-gray-400 mt-2">Loop count: {loopCountRef.current}</div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-xs text-gray-300 mb-2">
                              <span>Watch: {Math.round(watchedMs / 100) / 10}s / {activeVideo.durationSec}s</span>
                              <span>Completion: {clamp(completionPct, 0, 100)}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div className="h-2 bg-white" style={{ width: `${clamp(completionPct, 0, 100)}%` }} />
                            </div>

                            <div className="mt-4 flex items-center gap-3 flex-wrap">
                              <button
                                onClick={togglePlay}
                                className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${
                                  currentUser ? "bg-white text-gray-900 hover:bg-gray-200" : "bg-gray-700 text-gray-300 cursor-not-allowed"
                                }`}
                                disabled={!currentUser}
                              >
                                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                                {isPlaying ? "Pause" : "Play"}
                              </button>

                              <div className="ml-auto flex items-center gap-6 text-gray-200">
                                <span className="flex items-center gap-2"><Eye size={16} /> {activeVideo.views.toLocaleString()}</span>
                                <span className="flex items-center gap-2"><Heart size={16} /> {activeVideo.likes.toLocaleString()}</span>
                                <span className="flex items-center gap-2"><MessageCircle size={16} /> {(activeVideo.shares || 0).toLocaleString()} shares</span>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-gray-300">Aucune vidéo.</div>
                      )}
                    </div>

                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                      <button onClick={goPrev} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" title="Précédente">
                        <ChevronUp size={22} />
                      </button>
                      <button onClick={goNext} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" title="Suivante">
                        <ChevronDown size={22} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-gray-500">
                    Vue simulée : comptée si watch ≥ 2s. Completion + rewatch renforcent l’intérêt (profil local).
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white border rounded-lg p-4">
                    <div className="font-bold mb-2 flex items-center gap-2">
                      <Users size={18} /> Comptes internes
                    </div>
                    {!catalogLoaded ? (
                      <div className="text-sm text-gray-500">Chargement…</div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-auto">
                        {catalog.accounts.map((a) => (
                          <div key={a.id} className="flex items-center justify-between text-sm border-b pb-2">
                            <div className="font-semibold">@{a.username}</div>
                            <div className="text-gray-600">{a.followers.toLocaleString()} followers</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white border rounded-lg p-4">
                    <div className="font-bold mb-2">File (For You)</div>
                    <div className="text-sm text-gray-700">Index: <span className="font-semibold">{activeIndex + 1}</span> / {feed.length || 0}</div>
                    <div className="text-xs text-gray-500 mt-2">Explore injection: 1 vidéo “découverte” toutes les {exploreEvery} vidéos.</div>
                  </div>
                </div>
              </div>
            )}

            {/* GROWTH */}
            {tab === "growth" && (
              <div className="space-y-6">
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                  <div className="text-blue-900 font-semibold flex items-center gap-2">
                    <Package size={18} />
                    Growth Platform (sim) — workflow “username/video → package → delivery → cooldown”, uniquement interne.
                  </div>
                  <div className="text-xs text-blue-800 mt-2 flex items-center gap-2">
                    <Timer size={14} /> Cooldown simulé “perks” par utilisateur/service.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white border rounded-lg p-4">
                    <div className="font-bold mb-3">1) Choisir le service</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { k: "followers", label: "Followers" },
                        { k: "likes", label: "Likes" },
                        { k: "views", label: "Views" },
                        { k: "shares", label: "Shares" }
                      ].map((s) => (
                        <button
                          key={s.k}
                          onClick={() => setGrowthService(s.k)}
                          className={`px-4 py-2 rounded-lg font-semibold border ${
                            growthService === s.k ? "bg-purple-600 text-white border-purple-600" : "bg-white hover:bg-gray-50"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4">
                      <div className="font-bold mb-2">2) Cible (champ unique, interne)</div>

                      {growthService === "followers" ? (
                        <div className="space-y-2">
                          <div className="text-xs text-gray-500">
                            Tape un @username. Seuls les comptes internes sont acceptés (auto-suggestions).
                          </div>
                          <TargetPicker
                            placeholder="@target_account"
                            items={catalog.accounts.map((a) => ({ key: a.username, label: `@${a.username}`, sub: `${a.followers.toLocaleString()} followers` }))}
                            value={targetAccountInput}
                            onChange={setTargetAccountInput}
                            onPick={(val) => setTargetAccount(val)}
                            onCreate={async (raw) => {
                              const created = await createDemoAccount(raw);
                              if (created) {
                                setTargetAccount(created.username);
                                setTargetAccountInput(`@${created.username}`);
                              }
                            }}
                          />
                          <div className="text-xs text-gray-500">
                            Sélection actuelle: <span className="font-semibold">@{targetAccount}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-xs text-gray-500">
                            Tape un ID vidéo (ex: 101) ou cherche par titre. Seules les vidéos internes sont acceptées.
                          </div>
                          <TargetPicker
                            placeholder="#101"
                            items={catalog.videos.map((v) => ({ key: String(v.id), label: `#${v.id} — ${v.title}`, sub: `@${v.author}` }))}
                            value={targetVideoInput}
                            onChange={setTargetVideoInput}
                            onPick={(val) => setTargetVideoId(parseInt(val, 10))}
                            onCreate={async (raw) => {
                              const created = await createDemoVideo(raw);
                              if (created) {
                                setTargetVideoId(created.id);
                                setTargetVideoInput(String(created.id));
                              }
                            }}
                          />
                          <div className="text-xs text-gray-500">
                            Sélection actuelle: <span className="font-semibold">video #{targetVideoId}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <div className="font-bold mb-2">3) Choisir un package (sim)</div>
                        <div className="grid grid-cols-4 gap-2">
                          {amountOptions.map((a) => (
                            <button
                              key={a}
                              onClick={() => setGrowthAmount(a)}
                              className={`px-3 py-2 rounded-lg font-semibold border ${
                                growthAmount === a ? "bg-gray-900 text-white border-gray-900" : "bg-white hover:bg-gray-50"
                              }`}
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Delivery simulée (progression variable, parfois “throttling”).
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={startCampaign}
                        className={`flex-1 px-4 py-2 rounded-lg font-semibold ${
                          currentUser ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-gray-300 text-gray-600 cursor-not-allowed"
                        }`}
                        disabled={!currentUser}
                      >
                        Start (sim)
                      </button>
                      <button
                        onClick={refreshCampaigns}
                        className="px-4 py-2 rounded-lg font-semibold bg-gray-100 hover:bg-gray-200"
                      >
                        Refresh
                      </button>
                    </div>

                    {campaignError && (
                      <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                        {campaignError}
                      </div>
                    )}
                  </div>

                  <div className="bg-white border rounded-lg p-4">
                    <div className="font-bold mb-3 flex items-center gap-2">
                      <Activity size={18} /> Campagnes récentes (sim)
                    </div>

                    {campaigns.length === 0 ? (
                      <div className="text-gray-500">Aucune campagne.</div>
                    ) : (
                      <div className="space-y-3 max-h-[480px] overflow-auto">
                        {campaigns.slice(0, 25).map((c) => {
                          const pct = c.amount ? Math.round((c.delivered / c.amount) * 100) : 0;
                          const targetLabel =
                            c.target?.kind === "account"
                              ? `@${c.target.username}`
                              : `video #${c.target.videoId}`;
                          return (
                            <div key={c.id} className="border rounded-lg p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-semibold">
                                    {c.service} → {targetLabel} ({c.delivered}/{c.amount})
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    by @{c.actor} • {c.status} • {fmtTime(c.createdAt)}
                                  </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  c.status === "completed" ? "bg-green-100 text-green-800" :
                                  c.status === "running" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"
                                }`}>
                                  {c.status}
                                </span>
                              </div>

                              <div className="mt-2 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div className="h-2 bg-purple-600" style={{ width: `${clamp(pct, 0, 100)}%` }} />
                              </div>
                              <div className="mt-2 text-xs text-gray-600">Progress: {clamp(pct, 0, 100)}%</div>

                              <details className="mt-2">
                                <summary className="cursor-pointer text-xs text-gray-700 font-semibold">Logs</summary>
                                <div className="mt-2 bg-gray-900 text-green-300 rounded p-2 font-mono text-xs max-h-40 overflow-auto">
                                  {(c.logs || []).slice(-12).reverse().map((l, i) => (
                                    <div key={i}>[{fmtTime(l.ts)}] {l.msg}</div>
                                  ))}
                                </div>
                              </details>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-3 text-xs text-gray-500">
                      Important : cibles internes uniquement. Pas de champ libre “handle/URL” externe.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MAIL */}
            {tab === "email" && (
              <div className="space-y-6">
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                  <div className="text-blue-900 font-semibold flex items-center gap-2">
                    <Mail size={18} />
                    Simulation mail : création + inbox + OTP.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white border rounded-lg p-4">
                    <div className="font-bold mb-3">Créer un compte mail</div>
                    <div className="flex items-center gap-4 mb-3 text-sm">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={autoOtp} onChange={(e)=>setAutoOtp(e.target.checked)} className="w-4 h-4" />
                        <span className="font-semibold">Auto OTP</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={autoVerifyOtp} onChange={(e)=>setAutoVerifyOtp(e.target.checked)} className="w-4 h-4" />
                        <span className="font-semibold">Auto vérification</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={mailCreate.localPart} onChange={(e) => setMailCreate((p) => ({ ...p, localPart: e.target.value }))}
                        className="px-3 py-2 rounded-lg border" placeholder="local-part" />
                      <input value={mailCreate.domain} onChange={(e) => setMailCreate((p) => ({ ...p, domain: e.target.value }))}
                        className="px-3 py-2 rounded-lg border" placeholder="domain.local" />
                      <input value={mailCreate.password} onChange={(e) => setMailCreate((p) => ({ ...p, password: e.target.value }))}
                        className="col-span-2 px-3 py-2 rounded-lg border" type="password" placeholder="mot de passe (mail)" />
                    </div>
                    <button onClick={createMailAccount} className="mt-3 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold">
                      Créer le mail
                    </button>
                  </div>

                  <div className="bg-white border rounded-lg p-4">
                    <div className="font-bold mb-3">Connexion inbox + OTP</div>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={mailLogin.email} onChange={(e) => setMailLogin((p) => ({ ...p, email: e.target.value }))}
                        className="col-span-2 px-3 py-2 rounded-lg border" placeholder="email" />
                      <input value={mailLogin.password} onChange={(e) => setMailLogin((p) => ({ ...p, password: e.target.value }))}
                        className="col-span-2 px-3 py-2 rounded-lg border" type="password" placeholder="mot de passe" />
                      <button onClick={loginMailbox} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold flex items-center justify-center gap-2">
                        <LogIn size={18} /> Login inbox
                      </button>
                      <button onClick={logoutMailbox} className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-semibold flex items-center justify-center gap-2">
                        <LogOut size={18} /> Logout
                      </button>
                    </div>

                    <div className="mt-4 border-t pt-4 space-y-2">
                      <div className="font-semibold">Envoyer / Vérifier OTP</div>
                      <input value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border" placeholder="email@labmail.local" />
                      <div className="flex items-center justify-between">
                        <button onClick={sendOtp} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
                          Envoyer OTP
                        </button>
                        {emailVerifiedBadge(otpEmail)}
                      </div>
                      <div className="flex gap-2">
                        <input value={otpInput} onChange={(e) => setOtpInput(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border" placeholder="Code 6 chiffres" />
                        <button onClick={verifyOtp} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold flex items-center gap-2">
                          <KeyRound size={18} /> Vérifier
                        </button>
                      </div>
                      <div className="text-xs text-gray-500">Rate limit : 1 OTP / 20s par boîte.</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-4">
                  <div className="font-bold mb-3">Comptes mail existants</div>
                  {mailAccounts.length === 0 ? (
                    <div className="text-gray-500">Aucun compte mail.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {mailAccounts.map((mb) => (
                        <div key={mb.email} className="bg-gray-50 border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold">{mb.email}</div>
                            <button onClick={() => deleteMailAccount(mb.email)} className="text-red-600 hover:text-red-700 text-sm font-semibold">
                              Supprimer
                            </button>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Créé: {fmtTime(mb.createdAt)} • {mb.verifiedAt ? "✅ vérifié" : "❌ non vérifié"}</div>
                          <div className="mt-2 text-xs text-gray-600">(mdp mail démo : <span className="font-mono">{mb.passwordPlain}</span>)</div>

                          <div className="mt-3 text-sm font-semibold">Inbox</div>
                          <div className="mt-2 space-y-2 max-h-56 overflow-auto">
                            {mb.inbox.length === 0 ? (
                              <div className="text-sm text-gray-500">Inbox vide.</div>
                            ) : (
                              mb.inbox.map((m) => (
                                <div key={m.id} className="bg-white border rounded p-2">
                                  <div className="text-sm font-semibold">{m.subject}</div>
                                  <div className="text-xs text-gray-500">{fmtTime(m.sentAt)}</div>
                                  <pre className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{m.body}</pre>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border rounded-lg p-4">
                  <div className="font-bold mb-2">Session inbox</div>
                  {mailSession?.email ? (
                    <div className="text-sm text-gray-700">Connecté sur <span className="font-semibold">{mailSession.email}</span></div>
                  ) : (
                    <div className="text-sm text-gray-500">Aucune inbox connectée.</div>
                  )}
                </div>
              </div>
            )}

            {/* AUTH */}
            {tab === "auth" && (
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white border rounded-lg p-4">
                  <div className="font-bold mb-3 flex items-center gap-2">
                    <LogIn size={18} /> Connexion
                  </div>
                  <div className="space-y-2">
                    <input value={login.email} onChange={(e) => setLogin((p) => ({ ...p, email: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border" placeholder="email" />
                    <input value={login.password} onChange={(e) => setLogin((p) => ({ ...p, password: e.target.value }))}
                      type="password" className="w-full px-3 py-2 rounded-lg border" placeholder="mot de passe" />
                    <button onClick={doLogin} disabled={authBusy} className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold disabled:bg-gray-400">
                      Se connecter
                    </button>
                  </div>
                  <div className="mt-4 text-xs text-gray-500">Crée un mail + OTP d’abord, puis signup.</div>
                </div>

                <div className="bg-white border rounded-lg p-4">
                  <div className="font-bold mb-3 flex items-center gap-2">
                    <Mail size={18} /> Inscription (OTP requis)
                  </div>

                  <div className="space-y-2">
                    <input value={signup.email} onChange={(e) => setSignup((p) => ({ ...p, email: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border" placeholder="email@labmail.local" />
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">Statut OTP:</div>
                      {emailVerifiedBadge(signup.email)}
                    </div>

                    <input value={signup.username} onChange={(e) => setSignup((p) => ({ ...p, username: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border" placeholder="username" />
                    <input value={signup.password} onChange={(e) => setSignup((p) => ({ ...p, password: e.target.value }))}
                      type="password" className="w-full px-3 py-2 rounded-lg border" placeholder="mot de passe" />
                    <button onClick={doSignup} disabled={authBusy} className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:bg-gray-400">
                      Créer le compte
                    </button>
                  </div>
                </div>

                <div className="col-span-2 bg-gray-50 border rounded-lg p-4">
                  <div className="font-bold mb-2">Utilisateurs (lab)</div>
                  {users.length === 0 ? (
                    <div className="text-gray-500">Aucun utilisateur.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {users.map((u) => (
                        <div key={u.id} className="bg-white border rounded p-3">
                          <div className="font-semibold">@{u.username}</div>
                          <div className="text-xs text-gray-500">{u.email}</div>
                          <div className="text-xs text-gray-500 mt-1">Créé: {fmtTime(u.createdAt)} • {u.hashB64 ? "PBKDF2" : "fallback"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          Le module “Growth Platform” simule une file de jobs + cooldown + delivery variable côté serveur, sans cibles externes.
        </div>
      </div>
    </div>
  );
}

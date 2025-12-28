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
  Settings
} from "lucide-react";

/**
 * FakeTokLab (OFFLINE / SIMULATION)
 * - "Email provider" simulé : création compte mail + inbox + OTP
 * - Signup/Login (PBKDF2 si WebCrypto dispo)
 * - Feed vertical : autoplay, loop/rewatch, watch time + completion
 * - "For You" : ranking basé sur signaux + intérêts tags + explore injection
 * - Preview (1–3s) "Next up" ne compte pas comme vue
 * - 0 API externe
 */

const LS = {
  MAIL_ACCOUNTS: "faketok_mail_accounts_v4",
  USERS: "faketok_users_v4",
  SESSION: "faketok_session_v4",
  PLATFORM: "faketok_platform_v4",
  PROFILES: "faketok_profiles_v4"
};

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function now() {
  return Date.now();
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  const e = normalizeEmail(email);
  return e.includes("@") && e.includes(".");
}

function otp6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function bytesToB64(bytes) {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function makeSaltB64() {
  if (!globalThis.crypto?.getRandomValues) return null;
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return bytesToB64(salt);
}

async function hashPasswordPBKDF2(password, saltB64, iterations = 120000) {
  if (!globalThis.crypto?.subtle) return null;

  const enc = new TextEncoder();
  const passKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const saltBytes = b64ToBytes(saltB64);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" },
    passKey,
    256
  );
  return bytesToB64(new Uint8Array(bits));
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function log1p(n) {
  return Math.log(1 + Math.max(0, n));
}

export default function FakeTokLab() {
  const [tab, setTab] = useState("feed");

  // ------------------ PLATFORM ------------------
  const [platform, setPlatform] = useState(() => {
    const saved = safeParse(localStorage.getItem(LS.PLATFORM), null);
    if (saved) return saved;

    const seedTs = now();
    return {
      accounts: [
        { id: 1, username: "user_alice", followers: 1250, following: 180 },
        { id: 2, username: "user_bob", followers: 890, following: 220 },
        { id: 3, username: "target_account", followers: 5420, following: 35 }
      ],
      videos: [
        {
          id: 101,
          author: "target_account",
          title: "Ma première vidéo",
          views: 12500,
          likes: 890,
          comments: 120,
          durationSec: 18,
          tags: ["intro", "daily"],
          createdAt: seedTs - 1000 * 60 * 60 * 24 * 10
        },
        {
          id: 102,
          author: "target_account",
          title: "Tutoriel danse",
          views: 8900,
          likes: 654,
          comments: 75,
          durationSec: 24,
          tags: ["dance", "tutorial"],
          createdAt: seedTs - 1000 * 60 * 60 * 24 * 2
        },
        {
          id: 103,
          author: "user_alice",
          title: "Recette rapide 🍜",
          views: 4200,
          likes: 310,
          comments: 18,
          durationSec: 15,
          tags: ["food", "recipe"],
          createdAt: seedTs - 1000 * 60 * 60 * 24 * 5
        },
        {
          id: 104,
          author: "user_bob",
          title: "Astuce productivité ⏱️",
          views: 2500,
          likes: 220,
          comments: 40,
          durationSec: 20,
          tags: ["productivity", "tips"],
          createdAt: seedTs - 1000 * 60 * 60 * 24 * 1
        }
      ],
      follows: [],
      events: [],
      commentsStore: {}
    };
  });

  useEffect(() => {
    localStorage.setItem(LS.PLATFORM, JSON.stringify(platform));
  }, [platform]);

  // ------------------ EMAIL PROVIDER SIM ------------------
  const [mailAccounts, setMailAccounts] = useState(() => {
    const saved = safeParse(localStorage.getItem(LS.MAIL_ACCOUNTS), []);
    return Array.isArray(saved) ? saved : [];
  });

  useEffect(() => {
    localStorage.setItem(LS.MAIL_ACCOUNTS, JSON.stringify(mailAccounts));
  }, [mailAccounts]);

  const mailMap = useMemo(() => {
    const m = new Map();
    mailAccounts.forEach((a) => m.set(a.email, a));
    return m;
  }, [mailAccounts]);

  const [mailCreate, setMailCreate] = useState({
    localPart: "student1",
    domain: "faketokmail.local",
    password: "mail1234"
  });

  const [mailLogin, setMailLogin] = useState({
    email: "student1@faketokmail.local",
    password: "mail1234"
  });

  const [mailSession, setMailSession] = useState(null); // { email }
  const currentMailbox = useMemo(() => {
    if (!mailSession?.email) return null;
    return mailMap.get(mailSession.email) || null;
  }, [mailSession, mailMap]);

  function createMailAccount() {
    const email = normalizeEmail(`${mailCreate.localPart}@${mailCreate.domain}`);
    const pass = String(mailCreate.password || "");
    if (!isValidEmail(email) || pass.length < 4) return;

    setMailAccounts((prev) => {
      if (prev.some((x) => x.email === email)) return prev;
      return [
        ...prev,
        {
          email,
          passwordPlain: pass,
          createdAt: now(),
          inbox: [],
          verifiedAt: null,
          lastOtpSentAt: 0
        }
      ];
    });

    setMailLogin({ email, password: pass });
  }

  function loginMailbox() {
    const email = normalizeEmail(mailLogin.email);
    const pass = String(mailLogin.password || "");
    const acc = mailMap.get(email);
    if (!acc) return;
    if (acc.passwordPlain !== pass) return;
    setMailSession({ email });
  }

  function logoutMailbox() {
    setMailSession(null);
  }

  function deleteMailAccount(email) {
    const e = normalizeEmail(email);
    setMailAccounts((prev) => prev.filter((a) => a.email !== e));
    if (mailSession?.email === e) setMailSession(null);
  }

  const [otpEmail, setOtpEmail] = useState("student1@faketokmail.local");
  const [otpInput, setOtpInput] = useState("");

  function sendOtp() {
    const email = normalizeEmail(otpEmail);
    if (!isValidEmail(email)) return;

    setMailAccounts((prev) =>
      prev.map((mb) => {
        if (mb.email !== email) return mb;

        // rate limit : 1 OTP / 20s
        const since = now() - (mb.lastOtpSentAt || 0);
        if (since < 20000) return mb;

        const code = otp6();
        const msg = {
          id: "msg_" + Math.random().toString(36).slice(2),
          subject: "FakeTok — Code de vérification",
          body: `Votre code OTP est : ${code}\n(Boîte mail simulée, offline)`,
          otp: code,
          sentAt: now()
        };

        return {
          ...mb,
          lastOtpSentAt: now(),
          inbox: [msg, ...mb.inbox].slice(0, 30),
          verifiedAt: null
        };
      })
    );
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

    setMailAccounts((prev) =>
      prev.map((x) => (x.email === email ? { ...x, verifiedAt: now() } : x))
    );
  }

  function emailVerifiedBadge(email) {
    const e = normalizeEmail(email);
    const mb = mailMap.get(e);
    const ok = Boolean(mb?.verifiedAt);
    return (
      <span
        className={`text-xs px-2 py-1 rounded ${
          ok ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
        }`}
      >
        {ok ? "Vérifié" : "Non vérifié"}
      </span>
    );
  }

  // ------------------ USERS + SESSION ------------------
  const [users, setUsers] = useState(() => {
    const saved = safeParse(localStorage.getItem(LS.USERS), []);
    return Array.isArray(saved) ? saved : [];
  });

  useEffect(() => {
    localStorage.setItem(LS.USERS, JSON.stringify(users));
  }, [users]);

  const [session, setSession] = useState(() => {
    return safeParse(localStorage.getItem(LS.SESSION), null);
  });

  useEffect(() => {
    localStorage.setItem(LS.SESSION, JSON.stringify(session));
  }, [session]);

  const currentUser = useMemo(() => {
    if (!session?.userId) return null;
    return users.find((u) => u.id === session.userId) || null;
  }, [session, users]);

  const cryptoAvailable = Boolean(globalThis.crypto?.subtle);

  const [signup, setSignup] = useState({
    email: "student1@faketokmail.local",
    username: "student1",
    password: "demo1234"
  });

  const [login, setLogin] = useState({
    email: "student1@faketokmail.local",
    password: "demo1234"
  });

  const [authBusy, setAuthBusy] = useState(false);

  async function doSignup() {
    const email = normalizeEmail(signup.email);
    const username = String(signup.username || "").trim();
    const password = String(signup.password || "");

    if (!isValidEmail(email) || !username || password.length < 4) return;

    const mb = mailMap.get(email);
    if (!mb || !mb.verifiedAt) return;

    if (users.some((u) => u.email === email)) return;
    if (users.some((u) => u.username === username)) return;

    setAuthBusy(true);
    try {
      const id = Math.max(0, ...users.map((u) => u.id)) + 1;

      const saltB64 = await makeSaltB64();
      const hashB64 = saltB64 ? await hashPasswordPBKDF2(password, saltB64) : null;

      const newUser = {
        id,
        email,
        username,
        createdAt: now(),
        saltB64: saltB64 || null,
        hashB64: hashB64 || null,
        passwordPlainFallback: hashB64 ? null : password
      };

      setUsers((prev) => [...prev, newUser]);
      setSession({ userId: id, loggedInAt: now() });

      // ajouter compte plateforme
      setPlatform((p) => {
        if (p.accounts.some((a) => a.username === username)) return p;
        const nextId = Math.max(0, ...p.accounts.map((a) => a.id)) + 1;
        return {
          ...p,
          accounts: [...p.accounts, { id: nextId, username, followers: 0, following: 0 }]
        };
      });

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

  function doLogout() {
    setSession(null);
  }

  // ------------------ INTEREST PROFILES ------------------
  const [profiles, setProfiles] = useState(() => {
    const saved = safeParse(localStorage.getItem(LS.PROFILES), {});
    return saved && typeof saved === "object" ? saved : {};
  });

  useEffect(() => {
    localStorage.setItem(LS.PROFILES, JSON.stringify(profiles));
  }, [profiles]);

  function bumpProfileSignal({ username, tags = [], author, amount = 1 }) {
    if (!username) return;

    setProfiles((prev) => {
      const base = prev[username] || { tagWeights: {}, authorWeights: {} };
      const next = {
        tagWeights: { ...base.tagWeights },
        authorWeights: { ...base.authorWeights }
      };

      for (const t of tags) next.tagWeights[t] = (next.tagWeights[t] || 0) + amount;
      if (author) next.authorWeights[author] = (next.authorWeights[author] || 0) + amount;

      return { ...prev, [username]: next };
    });
  }

  // ------------------ FEED SESSION ------------------
  const [mode, setMode] = useState("foryou");
  const [autoplay, setAutoplay] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [watchedMs, setWatchedMs] = useState(0);

  // Réalisme
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [exploreEvery, setExploreEvery] = useState(6);
  const [previewSeconds, setPreviewSeconds] = useState(1.5);
  const [previewing, setPreviewing] = useState(null);

  const tickRef = useRef(null);
  const lastTickRef = useRef(null);
  const loopCountRef = useRef(0);

  const followingSet = useMemo(() => {
    const u = currentUser?.username;
    if (!u) return new Set();
    return new Set(platform.follows.filter((f) => f.follower === u).map((f) => f.following));
  }, [platform.follows, currentUser]);

  const followingFeed = useMemo(() => {
    if (!currentUser) return [];
    return platform.videos.filter((v) => followingSet.has(v.author));
  }, [platform.videos, followingSet, currentUser]);

  const forYouFeed = useMemo(() => {
    const u = currentUser?.username;
    const prof = u ? profiles[u] : null;

    const scored = platform.videos.map((v) => {
      const pop = 0.6 * log1p(v.views) + 1.1 * log1p(v.likes) + 0.4 * log1p(v.comments);

      const ageDays = (now() - (v.createdAt || now())) / (1000 * 60 * 60 * 24);
      const recency = 1 / (1 + 0.15 * ageDays);

      let aff = 0;
      if (prof) {
        for (const t of v.tags || []) aff += (prof.tagWeights?.[t] || 0) * 0.35;
        aff += (prof.authorWeights?.[v.author] || 0) * 0.55;
      }

      const followBoost = currentUser && followingSet.has(v.author) ? 1.1 : 1.0;
      const score = (pop * recency + aff) * followBoost;
      return { v, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const base = scored.map((x) => x.v);

    // Explore injection (découverte)
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
          if (!used.has(vv.id)) {
            candidate = vv;
            poolIdx = (poolIdx + k + 1) % pool.length;
            break;
          }
        }
        if (candidate) {
          used.add(candidate.id);
          injected.push(candidate);
        }
      }
    }

    return injected;
  }, [platform.videos, profiles, currentUser, followingSet, exploreEvery]);

  const feed = useMemo(() => {
    const list = mode === "following" ? followingFeed : forYouFeed;
    return list.length ? list : forYouFeed;
  }, [mode, followingFeed, forYouFeed]);

  const activeVideo = useMemo(() => feed[activeIndex] || null, [feed, activeIndex]);

  // reset when video changes
  useEffect(() => {
    setWatchedMs(0);
    loopCountRef.current = 0;

    if (autoplay) {
      setIsPlaying(true);
      lastTickRef.current = now();
    } else {
      setIsPlaying(false);
      lastTickRef.current = null;
    }
  }, [activeVideo?.id, autoplay]);

  // ticking watch time while playing
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

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [isPlaying, activeVideo?.id]);

  function commitWatchEvent({ reason }) {
    if (!currentUser || !activeVideo) return;

    const durationMs = (activeVideo.durationSec || 15) * 1000;
    const completion = durationMs > 0 ? watchedMs / durationMs : 0;
    const countsAsView = watchedMs >= 2000;

    const isRewatch = loopCountRef.current > 0;

    setPlatform((p) => {
      const vids = p.videos.map((v) => {
        if (v.id !== activeVideo.id) return v;
        return countsAsView ? { ...v, views: v.views + 1 } : v;
      });

      const ev = {
        id: "ev_" + Math.random().toString(36).slice(2),
        ts: now(),
        actor: currentUser.username,
        type: "watch",
        videoId: activeVideo.id,
        watchedMs,
        completion,
        countsAsView,
        reason,
        loopCount: loopCountRef.current,
        isRewatch
      };

      return { ...p, videos: vids, events: [ev, ...p.events].slice(0, 300) };
    });

    // rewatch = signal plus fort mais décroissant
    const rewatchBoost = isRewatch ? 1 / (1 + loopCountRef.current) : 1;
    const amount =
      (countsAsView ? 0.8 + 1.8 * completion : 0.2) * (1 + 0.8 * rewatchBoost);

    bumpProfileSignal({
      username: currentUser.username,
      tags: activeVideo.tags || [],
      author: activeVideo.author,
      amount
    });
  }

  // loop/rewatch ou auto-next
  useEffect(() => {
    if (!activeVideo || !isPlaying) return;
    const durationMsLocal = (activeVideo.durationSec || 15) * 1000;
    if (watchedMs < durationMsLocal) return;

    setIsPlaying(false);
    commitWatchEvent({ reason: "ended" });

    if (loopEnabled) {
      loopCountRef.current += 1;
      setWatchedMs(0);
      if (autoplay) {
        setTimeout(() => {
          setIsPlaying(true);
          lastTickRef.current = now();
        }, 180);
      }
      return;
    }

    if (autoplay) {
      setTimeout(() => {
        goNext();
      }, 250);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedMs, activeVideo?.id, isPlaying, autoplay, loopEnabled]);

  function togglePlay() {
    if (!activeVideo) return;
    if (!currentUser) return;

    if (isPlaying) {
      setIsPlaying(false);
      commitWatchEvent({ reason: "pause" });
    } else {
      setIsPlaying(true);
      lastTickRef.current = now();
    }
  }

  function goNext() {
    if (!feed.length) return;
    if (isPlaying) {
      setIsPlaying(false);
      commitWatchEvent({ reason: "swipe_next" });
    } else if (currentUser && activeVideo && watchedMs > 0) {
      commitWatchEvent({ reason: "swipe_next" });
    }
    setActiveIndex((i) => Math.min(i + 1, feed.length - 1));
  }

  function goPrev() {
    if (!feed.length) return;
    if (isPlaying) {
      setIsPlaying(false);
      commitWatchEvent({ reason: "swipe_prev" });
    } else if (currentUser && activeVideo && watchedMs > 0) {
      commitWatchEvent({ reason: "swipe_prev" });
    }
    setActiveIndex((i) => Math.max(i - 1, 0));
  }

  function likeVideo() {
    if (!currentUser || !activeVideo) return;

    setPlatform((p) => {
      const vids = p.videos.map((v) =>
        v.id === activeVideo.id ? { ...v, likes: v.likes + 1 } : v
      );
      const ev = {
        id: "ev_" + Math.random().toString(36).slice(2),
        ts: now(),
        actor: currentUser.username,
        type: "like",
        videoId: activeVideo.id
      };
      return { ...p, videos: vids, events: [ev, ...p.events].slice(0, 300) };
    });

    bumpProfileSignal({
      username: currentUser.username,
      tags: activeVideo.tags || [],
      author: activeVideo.author,
      amount: 2.0
    });
  }

  function followAuthor() {
    if (!currentUser || !activeVideo) return;
    const author = activeVideo.author;
    if (author === currentUser.username) return;

    setPlatform((p) => {
      const already = p.follows.some(
        (f) => f.follower === currentUser.username && f.following === author
      );
      if (already) return p;

      const accounts = p.accounts.map((a) => {
        if (a.username === author) return { ...a, followers: a.followers + 1 };
        if (a.username === currentUser.username)
          return { ...a, following: (a.following || 0) + 1 };
        return a;
      });

      const ev = {
        id: "ev_" + Math.random().toString(36).slice(2),
        ts: now(),
        actor: currentUser.username,
        type: "follow",
        target: author
      };

      return {
        ...p,
        accounts,
        follows: [...p.follows, { follower: currentUser.username, following: author }],
        events: [ev, ...p.events].slice(0, 300)
      };
    });

    bumpProfileSignal({
      username: currentUser.username,
      tags: activeVideo.tags || [],
      author: activeVideo.author,
      amount: 3.0
    });
  }

  const [commentText, setCommentText] = useState("");
  function postComment() {
    if (!currentUser || !activeVideo) return;
    const text = String(commentText || "").trim();
    if (!text) return;

    setPlatform((p) => {
      const vids = p.videos.map((v) =>
        v.id === activeVideo.id ? { ...v, comments: v.comments + 1 } : v
      );
      const cs = { ...(p.commentsStore || {}) };
      const arr = cs[activeVideo.id] ? [...cs[activeVideo.id]] : [];
      arr.unshift({
        id: "c_" + Math.random().toString(36).slice(2),
        user: currentUser.username,
        text: text.slice(0, 140),
        ts: now()
      });
      cs[activeVideo.id] = arr.slice(0, 30);

      const ev = {
        id: "ev_" + Math.random().toString(36).slice(2),
        ts: now(),
        actor: currentUser.username,
        type: "comment",
        videoId: activeVideo.id,
        text: text.slice(0, 140)
      };

      return { ...p, videos: vids, commentsStore: cs, events: [ev, ...p.events].slice(0, 300) };
    });

    bumpProfileSignal({
      username: currentUser.username,
      tags: activeVideo.tags || [],
      author: activeVideo.author,
      amount: 1.2
    });

    setCommentText("");
  }

  function startPreview(videoId) {
    const s = Number(previewSeconds) || 1.5;
    const startedAt = now();
    setPreviewing({ videoId, startedAt, endsAt: startedAt + s * 1000 });

    setTimeout(() => {
      setPreviewing((p) => (p && p.videoId === videoId ? null : p));
    }, s * 1000 + 50);
  }

  // ------------------ RESET ------------------
  function resetEverything() {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;

    localStorage.removeItem(LS.PLATFORM);
    localStorage.removeItem(LS.MAIL_ACCOUNTS);
    localStorage.removeItem(LS.USERS);
    localStorage.removeItem(LS.SESSION);
    localStorage.removeItem(LS.PROFILES);

    setMailAccounts([]);
    setUsers([]);
    setSession(null);
    setProfiles({});
    setMailSession(null);

    const seedTs = now();
    setPlatform({
      accounts: [
        { id: 1, username: "user_alice", followers: 1250, following: 180 },
        { id: 2, username: "user_bob", followers: 890, following: 220 },
        { id: 3, username: "target_account", followers: 5420, following: 35 }
      ],
      videos: [
        { id: 101, author: "target_account", title: "Ma première vidéo", views: 12500, likes: 890, comments: 120, durationSec: 18, tags: ["intro", "daily"], createdAt: seedTs - 1000 * 60 * 60 * 24 * 10 },
        { id: 102, author: "target_account", title: "Tutoriel danse", views: 8900, likes: 654, comments: 75, durationSec: 24, tags: ["dance", "tutorial"], createdAt: seedTs - 1000 * 60 * 60 * 24 * 2 },
        { id: 103, author: "user_alice", title: "Recette rapide 🍜", views: 4200, likes: 310, comments: 18, durationSec: 15, tags: ["food", "recipe"], createdAt: seedTs - 1000 * 60 * 60 * 24 * 5 },
        { id: 104, author: "user_bob", title: "Astuce productivité ⏱️", views: 2500, likes: 220, comments: 40, durationSec: 20, tags: ["productivity", "tips"], createdAt: seedTs - 1000 * 60 * 60 * 24 * 1 }
      ],
      follows: [],
      events: [],
      commentsStore: {}
    });

    setMode("foryou");
    setAutoplay(true);
    setActiveIndex(0);
    setIsPlaying(false);
    setWatchedMs(0);
    setLoopEnabled(true);
    setExploreEvery(6);
    setPreviewSeconds(1.5);
    setPreviewing(null);
    setTab("feed");
  }

  // ------------------ UI HELPERS ------------------
  const activeAuthorFollowers = useMemo(() => {
    if (!activeVideo) return 0;
    return platform.accounts.find((a) => a.username === activeVideo.author)?.followers ?? 0;
  }, [platform.accounts, activeVideo]);

  const durationMs = (activeVideo?.durationSec || 15) * 1000;
  const completionPct = durationMs ? Math.round((watchedMs / durationMs) * 100) : 0;

  const videoComments = useMemo(() => {
    if (!activeVideo) return [];
    return (platform.commentsStore?.[activeVideo.id] || []).slice(0, 10);
  }, [platform.commentsStore, activeVideo]);

  // ------------------ RENDER ------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Shield className="text-purple-600" />
                FakeTok — Lab Offline (Web Service)
              </h1>
              <p className="text-gray-600 mt-2">
                Mail simulé + OTP, feed vertical avec watch time, loop/rewatch, explore injection, preview.
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
                  <button
                    onClick={doLogout}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition flex items-center gap-2"
                  >
                    <LogOut size={18} /> Déconnexion
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setTab("auth")}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                >
                  <LogIn size={18} /> Connexion / Signup
                </button>
              )}

              <button
                onClick={resetEverything}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2"
              >
                <Trash2 size={18} /> Reset
              </button>
            </div>
          </div>

          <div className="mt-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
            <div className="text-yellow-900 font-semibold">
              100% simulation : aucune plateforme externe, aucune automatisation réelle.
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg">
          <div className="flex border-b">
            {[
              { k: "feed", label: "🎬 Feed" },
              { k: "email", label: "📨 Mail Provider" },
              { k: "auth", label: "🔐 Auth" },
              { k: "trace", label: "🧾 Trace" }
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`flex-1 px-6 py-3 font-semibold transition ${
                  tab === t.k ? "bg-purple-600 text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
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
                        <div className="font-bold">{mode === "foryou" ? "For You" : "Following"}</div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setMode("foryou")}
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            mode === "foryou" ? "bg-white text-gray-900" : "bg-gray-700"
                          }`}
                        >
                          For You
                        </button>
                        <button
                          onClick={() => setMode("following")}
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            mode === "following" ? "bg-white text-gray-900" : "bg-gray-700"
                          }`}
                        >
                          Following
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 bg-gradient-to-b from-gray-800 to-black rounded-2xl p-6 min-h-[380px] flex flex-col justify-between">
                      {activeVideo ? (
                        <>
                          <div>
                            <div className="text-xs text-gray-300">
                              @{activeVideo.author} • {activeAuthorFollowers.toLocaleString()} followers
                            </div>
                            <div className="text-2xl font-bold mt-1">{activeVideo.title}</div>
                            <div className="text-sm text-gray-300 mt-2">
                              Tags: {(activeVideo.tags || []).map((t) => `#${t}`).join(" ")}
                            </div>
                            <div className="text-xs text-gray-400 mt-2">
                              Loop: {loopEnabled ? "ON" : "OFF"} • Rewatch count: {loopCountRef.current}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-xs text-gray-300 mb-2">
                              <span>
                                Watch: {Math.round(watchedMs / 100) / 10}s / {activeVideo.durationSec}s
                              </span>
                              <span>Completion: {clamp(completionPct, 0, 100)}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div className="h-2 bg-white" style={{ width: `${clamp(completionPct, 0, 100)}%` }} />
                            </div>

                            <div className="mt-4 flex items-center gap-3 flex-wrap">
                              <button
                                onClick={togglePlay}
                                className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${
                                  currentUser
                                    ? "bg-white text-gray-900 hover:bg-gray-200"
                                    : "bg-gray-700 text-gray-300 cursor-not-allowed"
                                }`}
                                disabled={!currentUser}
                              >
                                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                                {isPlaying ? "Pause" : "Play"}
                              </button>

                              <button
                                onClick={likeVideo}
                                disabled={!currentUser}
                                className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${
                                  currentUser ? "bg-pink-600 text-white hover:bg-pink-700" : "bg-gray-700 text-gray-300 cursor-not-allowed"
                                }`}
                              >
                                <Heart size={18} /> Like
                              </button>

                              <button
                                onClick={followAuthor}
                                disabled={!currentUser}
                                className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${
                                  currentUser ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-700 text-gray-300 cursor-not-allowed"
                                }`}
                              >
                                <UserPlus size={18} /> Follow
                              </button>

                              <label className="ml-auto flex items-center gap-2 text-sm text-gray-200">
                                <Settings size={16} />
                                <input
                                  type="checkbox"
                                  checked={autoplay}
                                  onChange={(e) => setAutoplay(e.target.checked)}
                                  className="w-4 h-4"
                                />
                                Autoplay
                              </label>

                              <label className="flex items-center gap-2 text-sm text-gray-200">
                                <input
                                  type="checkbox"
                                  checked={loopEnabled}
                                  onChange={(e) => setLoopEnabled(e.target.checked)}
                                  className="w-4 h-4"
                                />
                                Loop
                              </label>

                              <label className="flex items-center gap-2 text-sm text-gray-200">
                                <span className="text-xs text-gray-300">Explore every</span>
                                <input
                                  type="number"
                                  min="2"
                                  max="20"
                                  value={exploreEvery}
                                  onChange={(e) => setExploreEvery(parseInt(e.target.value || "6", 10))}
                                  className="w-16 px-2 py-1 rounded bg-gray-700 text-white"
                                />
                              </label>

                              <label className="flex items-center gap-2 text-sm text-gray-200">
                                <span className="text-xs text-gray-300">Preview</span>
                                <input
                                  type="number"
                                  min="1"
                                  max="3"
                                  step="0.5"
                                  value={previewSeconds}
                                  onChange={(e) => setPreviewSeconds(parseFloat(e.target.value || "1.5"))}
                                  className="w-16 px-2 py-1 rounded bg-gray-700 text-white"
                                />
                                <span className="text-xs text-gray-300">s</span>
                              </label>
                            </div>

                            <div className="mt-4 flex items-center gap-2">
                              <input
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder={currentUser ? "Commenter (sim)..." : "Connecte-toi pour commenter"}
                                disabled={!currentUser}
                                className="flex-1 px-3 py-2 rounded-lg text-gray-900"
                              />
                              <button
                                onClick={postComment}
                                disabled={!currentUser}
                                className={`px-4 py-2 rounded-lg font-semibold ${
                                  currentUser ? "bg-gray-200 text-gray-900 hover:bg-white" : "bg-gray-700 text-gray-300 cursor-not-allowed"
                                }`}
                              >
                                Envoyer
                              </button>
                            </div>

                            <div className="mt-4 flex items-center gap-6 text-gray-200">
                              <span className="flex items-center gap-2"><Eye size={16} /> {activeVideo.views.toLocaleString()}</span>
                              <span className="flex items-center gap-2"><Heart size={16} /> {activeVideo.likes.toLocaleString()}</span>
                              <span className="flex items-center gap-2"><MessageCircle size={16} /> {activeVideo.comments.toLocaleString()}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-gray-300">Aucune vidéo.</div>
                      )}
                    </div>

                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                      <button
                        onClick={goPrev}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                        title="Vidéo précédente"
                      >
                        <ChevronUp size={22} />
                      </button>
                      <button
                        onClick={goNext}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                        title="Vidéo suivante"
                      >
                        <ChevronDown size={22} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 bg-white border rounded-lg p-4">
                    <div className="font-bold mb-2">Commentaires (aperçu)</div>
                    {videoComments.length === 0 ? (
                      <div className="text-sm text-gray-500">Aucun commentaire sur cette vidéo.</div>
                    ) : (
                      <div className="space-y-2">
                        {videoComments.map((c) => (
                          <div key={c.id} className="text-sm">
                            <span className="font-semibold">@{c.user}</span>{" "}
                            <span className="text-gray-700">{c.text}</span>{" "}
                            <span className="text-xs text-gray-500">({fmtTime(c.ts)})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white border rounded-lg p-4">
                    <div className="font-bold mb-2 flex items-center gap-2">
                      <Users size={18} /> Comptes (sim)
                    </div>
                    <div className="space-y-2 max-h-56 overflow-auto">
                      {platform.accounts.map((a) => (
                        <div key={a.id} className="flex items-center justify-between text-sm border-b pb-2">
                          <div className="font-semibold">@{a.username}</div>
                          <div className="text-gray-600">
                            {a.followers.toLocaleString()} • suit {(a.following || 0).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg p-4">
                    <div className="font-bold mb-2">File actuelle</div>
                    {feed.length ? (
                      <div className="text-sm text-gray-700">
                        <div>Index: <span className="font-semibold">{activeIndex + 1}</span> / {feed.length}</div>
                        <div className="mt-2 text-xs text-gray-500">
                          Explore injection: 1 reco “découverte” toutes les {exploreEvery} vidéos.
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Feed vide.</div>
                    )}
                  </div>

                  <div className="bg-white border rounded-lg p-4">
                    <div className="font-bold mb-2">Next up (preview)</div>
                    {feed.length ? (
                      <div className="space-y-2">
                        {feed.slice(activeIndex + 1, activeIndex + 4).map((v) => (
                          <div key={v.id} className="flex items-center justify-between text-sm border rounded p-2">
                            <div>
                              <div className="font-semibold">{v.title}</div>
                              <div className="text-xs text-gray-500">@{v.author}</div>
                            </div>
                            <button
                              onClick={() => startPreview(v.id)}
                              className="px-3 py-1 rounded-lg bg-gray-900 text-white hover:bg-black font-semibold"
                            >
                              Preview {previewSeconds}s
                            </button>
                          </div>
                        ))}
                        {previewing && (
                          <div className="mt-2 text-xs text-gray-600">
                            Preview en cours sur vidéo #{previewing.videoId} (ne compte pas comme vue)
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Feed vide.</div>
                    )}
                  </div>

                  <div className="bg-white border rounded-lg p-4">
                    <div className="font-bold mb-2">Astuces pédagogiques</div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Vue comptée si watch ≥ 2s.</li>
                      <li>• Completion + rewatch renforcent l’intérêt.</li>
                      <li>• Like/Follow boostent tags + auteur.</li>
                      <li>• Explore injection simule la découverte.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* MAIL PROVIDER */}
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
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={mailCreate.localPart}
                        onChange={(e) => setMailCreate((p) => ({ ...p, localPart: e.target.value }))}
                        className="px-3 py-2 rounded-lg border"
                        placeholder="local-part"
                      />
                      <input
                        value={mailCreate.domain}
                        onChange={(e) => setMailCreate((p) => ({ ...p, domain: e.target.value }))}
                        className="px-3 py-2 rounded-lg border"
                        placeholder="domain.local"
                      />
                      <input
                        value={mailCreate.password}
                        onChange={(e) => setMailCreate((p) => ({ ...p, password: e.target.value }))}
                        className="col-span-2 px-3 py-2 rounded-lg border"
                        type="password"
                        placeholder="mot de passe (mail)"
                      />
                    </div>
                    <button
                      onClick={createMailAccount}
                      className="mt-3 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
                    >
                      Créer le mail
                    </button>
                  </div>

                  <div className="bg-white border rounded-lg p-4">
                    <div className="font-bold mb-3">Connexion inbox + OTP</div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={mailLogin.email}
                        onChange={(e) => setMailLogin((p) => ({ ...p, email: e.target.value }))}
                        className="col-span-2 px-3 py-2 rounded-lg border"
                        placeholder="email"
                      />
                      <input
                        value={mailLogin.password}
                        onChange={(e) => setMailLogin((p) => ({ ...p, password: e.target.value }))}
                        className="col-span-2 px-3 py-2 rounded-lg border"
                        type="password"
                        placeholder="mot de passe"
                      />
                      <button
                        onClick={loginMailbox}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold flex items-center justify-center gap-2"
                      >
                        <LogIn size={18} /> Login inbox
                      </button>
                      <button
                        onClick={() => setMailSession(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-semibold flex items-center justify-center gap-2"
                      >
                        <LogOut size={18} /> Logout
                      </button>
                    </div>

                    <div className="mt-4 border-t pt-4 space-y-2">
                      <div className="font-semibold">Envoyer / Vérifier OTP</div>
                      <input
                        value={otpEmail}
                        onChange={(e) => setOtpEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border"
                        placeholder="email@faketokmail.local"
                      />
                      <div className="flex items-center justify-between">
                        <button
                          onClick={sendOtp}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                        >
                          Envoyer OTP
                        </button>
                        {emailVerifiedBadge(otpEmail)}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border"
                          placeholder="Code 6 chiffres"
                        />
                        <button
                          onClick={verifyOtp}
                          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold flex items-center gap-2"
                        >
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
                            <button
                              onClick={() => deleteMailAccount(mb.email)}
                              className="text-red-600 hover:text-red-700 text-sm font-semibold"
                            >
                              Supprimer
                            </button>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Créé: {fmtTime(mb.createdAt)} • {mb.verifiedAt ? "✅ vérifié" : "❌ non vérifié"}
                          </div>

                          <div className="mt-2 text-xs text-gray-600">
                            (mdp mail démo : <span className="font-mono">{mb.passwordPlain}</span>)
                          </div>

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
                  {currentMailbox ? (
                    <div className="text-sm text-gray-700">
                      Connecté sur <span className="font-semibold">{currentMailbox.email}</span> • messages:{" "}
                      <span className="font-semibold">{currentMailbox.inbox.length}</span>
                    </div>
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
                    <input
                      value={login.email}
                      onChange={(e) => setLogin((p) => ({ ...p, email: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border"
                      placeholder="email"
                    />
                    <input
                      value={login.password}
                      onChange={(e) => setLogin((p) => ({ ...p, password: e.target.value }))}
                      type="password"
                      className="w-full px-3 py-2 rounded-lg border"
                      placeholder="mot de passe"
                    />
                    <button
                      onClick={doLogin}
                      disabled={authBusy}
                      className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold disabled:bg-gray-400"
                    >
                      Se connecter
                    </button>
                  </div>
                  <div className="mt-4 text-xs text-gray-500">
                    Crée un mail + OTP d’abord, puis signup.
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-4">
                  <div className="font-bold mb-3 flex items-center gap-2">
                    <Mail size={18} /> Inscription (mail + OTP requis)
                  </div>

                  <div className="space-y-2">
                    <input
                      value={signup.email}
                      onChange={(e) => setSignup((p) => ({ ...p, email: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border"
                      placeholder="email@faketokmail.local"
                    />
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">Statut OTP:</div>
                      {emailVerifiedBadge(signup.email)}
                    </div>

                    <input
                      value={signup.username}
                      onChange={(e) => setSignup((p) => ({ ...p, username: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border"
                      placeholder="username"
                    />
                    <input
                      value={signup.password}
                      onChange={(e) => setSignup((p) => ({ ...p, password: e.target.value }))}
                      type="password"
                      className="w-full px-3 py-2 rounded-lg border"
                      placeholder="mot de passe"
                    />
                    <button
                      onClick={doSignup}
                      disabled={authBusy}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:bg-gray-400"
                    >
                      Créer le compte
                    </button>
                  </div>
                </div>

                <div className="col-span-2 bg-gray-50 border rounded-lg p-4">
                  <div className="font-bold mb-2">Utilisateurs FakeTok (lab)</div>
                  {users.length === 0 ? (
                    <div className="text-gray-500">Aucun utilisateur.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {users.map((u) => (
                        <div key={u.id} className="bg-white border rounded p-3">
                          <div className="font-semibold">@{u.username}</div>
                          <div className="text-xs text-gray-500">{u.email}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Créé: {fmtTime(u.createdAt)} • {u.hashB64 ? "PBKDF2" : "fallback"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TRACE */}
            {tab === "trace" && (
              <div className="space-y-4">
                <div className="bg-white border rounded-lg p-4">
                  <div className="font-bold mb-2">Trace des actions (pédagogique)</div>
                  <div className="text-sm text-gray-600">
                    Watch events = watchedMs + completion + reason + loopCount.
                  </div>
                </div>

                <div className="bg-gray-900 text-green-300 rounded-lg p-4 font-mono text-sm max-h-[560px] overflow-auto">
                  {platform.events.length === 0 ? (
                    <div className="text-gray-500">Aucune action.</div>
                  ) : (
                    platform.events.map((e) => (
                      <div key={e.id} className="py-1">
                        [{fmtTime(e.ts)}] {e.actor} → {e.type}
                        {e.type === "watch" && (
                          <>
                            {" "}
                            (video {e.videoId}, {Math.round(e.watchedMs / 100) / 10}s, completion{" "}
                            {Math.round((e.completion || 0) * 100)}%, view={e.countsAsView ? "yes" : "no"},{" "}
                            {e.reason}, loopCount={e.loopCount})
                          </>
                        )}
                        {e.type === "like" && <> (video {e.videoId})</>}
                        {e.type === "comment" && <> (video {e.videoId}) : "{e.text}"</>}
                        {e.type === "follow" && <> (→ @{e.target})</>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          Note : logique principale ici est côté client (simulation). Pour du “prof-only”, migrer vers /api côté serveur.
        </div>
      </div>
    </div>
  );
}

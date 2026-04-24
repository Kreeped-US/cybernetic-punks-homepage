'use client';

// app/meta/MetaClient.js
// Mode 1: NEXUS live tier list with movement badges + countdown
// Mode 2: Interactive drag-and-drop tier list builder with image generation + sharing

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { track } from '@/lib/useTrack';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ─── CONSTANTS ───────────────────────────────────────────────

const TIERS = ['S', 'A', 'B', 'C', 'D', 'F'];

const TIER_STYLES = {
  S: { bg: '#ff2222', fg: '#fff',    label: 'DOMINANT', accent: '#ff2222' },
  A: { bg: '#ff8800', fg: '#000',    label: 'STRONG',   accent: '#ff8800' },
  B: { bg: '#00d4ff', fg: '#000',    label: 'VIABLE',   accent: '#00d4ff' },
  C: { bg: 'rgba(255,255,255,0.15)', fg: 'rgba(255,255,255,0.6)', label: 'WEAK',  accent: 'rgba(255,255,255,0.25)' },
  D: { bg: 'rgba(255,255,255,0.08)', fg: 'rgba(255,255,255,0.3)', label: 'AVOID', accent: 'rgba(255,255,255,0.15)' },
  F: { bg: 'rgba(255,34,34,0.15)',   fg: 'rgba(255,34,34,0.6)',   label: 'F TIER', accent: 'rgba(255,34,34,0.25)' },
};

const TIER_ORDER_MAP = { S: 0, A: 1, B: 2, C: 3, D: 4, F: 5 };

const SHELL_SYMBOLS = {
  Assassin: '◈', Destroyer: '⬢', Recon: '◇',
  Rook: '▣', Thief: '⬠', Triage: '◎', Vandal: '⬡',
};

const WEAPON_TYPE_ICONS = {
  'SNIPER':         '◎',
  'SHOTGUN':        '⊞',
  'ASSAULT RIFLE':  '≡',
  'AR':             '≡',
  'SMG':            '∷',
  'LMG':            '▬',
  'PISTOL':         '○',
  'SIDEARM':        '○',
  'RAILGUN':        '→',
  'MELEE':          '✦',
  'HEAVY':          '⊟',
};

function getImageSrc(nameOrItem, kind) {
  if (!nameOrItem) return null;
  if (typeof nameOrItem === 'object' && nameOrItem.raw) {
    const fn = nameOrItem.raw.image_filename;
    if (!fn) return null;
    const folder = nameOrItem.kind === 'shell' ? 'shells' : 'weapons';
    return `/images/${folder}/${fn}`;
  }
  if (typeof nameOrItem === 'object' && nameOrItem.image_filename) {
    const folder = kind === 'shell' ? 'shells' : 'weapons';
    return `/images/${folder}/${nameOrItem.image_filename}`;
  }
  return null;
}

const TREND_DISPLAY = {
  up:     { label: '↑ RISING',  color: '#00ff41' },
  down:   { label: '↓ FALLING', color: '#ff2222' },
  stable: { label: '→ STABLE',  color: 'rgba(255,255,255,0.25)' },
};

const TYPE_COLORS = {
  strategy: '#9b5de5', weapon: '#ff2222',
  loadout: '#ff8800', shell: '#00d4ff', ability: '#ffd700',
};

// ─── HELPERS ─────────────────────────────────────────────────

function hoursAgo(date) {
  if (!date) return null;
  const h = Math.floor((Date.now() - new Date(date).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getSecondsToNextCron() {
  const now = new Date();
  const s = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
  for (const h of [6, 12, 18, 24]) {
    if (s < h * 3600) return h * 3600 - s;
  }
  return 86400 - s;
}

function formatCronCountdown(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}H ${String(m).padStart(2, '0')}M`;
  return `${String(m).padStart(2, '0')}M ${String(secs % 60).padStart(2, '0')}S`;
}

function getWeaponIcon(weaponType) {
  const t = (weaponType || '').toUpperCase();
  return WEAPON_TYPE_ICONS[t] || '◈';
}

function buildPoolItems(weapons, shells, filter, categoryFilter) {
  let items = [];
  if (filter === 'shells') {
    items = (shells || []).map(s => ({
      id: 'shell-' + s.name,
      name: s.name,
      kind: 'shell',
      icon: SHELL_SYMBOLS[s.name] || '⬠',
      subtext: [
        s.ranked_tier_solo  ? `SOLO: ${s.ranked_tier_solo}`  : '',
        s.ranked_tier_squad ? `SQUAD: ${s.ranked_tier_squad}` : '',
      ].filter(Boolean).join(' • ') || 'SHELL',
      raw: s,
    }));
  } else {
    let ws = weapons || [];
    if (filter === 'category' && categoryFilter) {
      ws = ws.filter(w => (w.weapon_type || '').toUpperCase() === categoryFilter.toUpperCase());
    }
    items = ws.map(w => ({
      id: 'weapon-' + w.name,
      name: w.name,
      kind: 'weapon',
      icon: getWeaponIcon(w.weapon_type),
      subtext: [(w.weapon_type || '').toUpperCase(), w.damage ? `DMG ${w.damage}` : ''].filter(Boolean).join(' • ') || 'WEAPON',
      raw: w,
    }));
    if (filter === 'everything') {
      (shells || []).forEach(s => items.push({
        id: 'shell-' + s.name,
        name: s.name,
        kind: 'shell',
        icon: SHELL_SYMBOLS[s.name] || '⬠',
        subtext: [
          s.ranked_tier_solo  ? `SOLO: ${s.ranked_tier_solo}`  : '',
          s.ranked_tier_squad ? `SQUAD: ${s.ranked_tier_squad}` : '',
        ].filter(Boolean).join(' • ') || 'SHELL',
        raw: s,
      }));
    }
  }
  return items;
}

function getUniqueWeaponTypes(weapons) {
  const types = new Set((weapons || []).map(w => (w.weapon_type || '').toUpperCase()).filter(Boolean));
  return [...types].sort();
}

// ─── CANVAS IMAGE GENERATOR ─────────────────────────────────
// UNCHANGED — existing share image design is intentional brand asset

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise(resolve => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function generateTierImage(tierItems, runnerTag) {
  try { await document.fonts.ready; } catch (_) {}

  const imageCache = {};
  for (const items of Object.values(tierItems)) {
    for (const item of items) {
      const src = getImageSrc(item);
      if (src && !imageCache[src]) {
        imageCache[src] = await loadImage(src);
      }
    }
  }

  const W = 1200, H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#030303';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(0,245,255,0.022)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  ctx.fillStyle = 'rgba(0,245,255,0.008)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);

  ctx.fillStyle = '#ff0000';
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(36, 36, 6, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '700 14px Orbitron, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CYBERNETICPUNKS', 52, 42);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px Orbitron, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('MARATHON TIER LIST', W - 32, 34);

  const now = new Date();
  const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const dateStamp = 'SEASON 1 — ' + monthNames[now.getMonth()] + ' ' + now.getFullYear();
  ctx.fillStyle = 'rgba(0,245,255,0.7)';
  ctx.font = '400 11px "Share Tech Mono", monospace, sans-serif';
  ctx.fillText(dateStamp, W - 32, 52);

  const tag = runnerTag?.trim() || 'ANONYMOUS RUNNER';
  ctx.fillStyle = '#ff8800';
  ctx.font = '700 12px "Share Tech Mono", monospace, sans-serif';
  ctx.fillText('by ' + tag.toUpperCase(), W - 32, 68);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(24, 78, W - 48, 1);

  const rowStart = 86;
  const rowH = 71;

  const tierColors = {
    S: '#ff0000', A: '#ff8800', B: '#00f5ff',
    C: 'rgba(200,200,200,0.4)', D: 'rgba(150,150,150,0.25)', F: 'rgba(255,0,0,0.25)',
  };
  const tierBgs = {
    S: 'rgba(255,0,0,0.12)',
    A: 'rgba(255,136,0,0.07)',
    B: 'rgba(0,245,255,0.05)',
    C: 'rgba(255,255,255,0.02)',
    D: 'rgba(255,255,255,0.008)',
    F: 'rgba(255,0,0,0.02)',
  };

  const pillH = 44;
  const pillGap = 6;
  const imgW = 40, imgH = 28;
  const textPadL = 10, textPadR = 14;

  TIERS.forEach((tier, i) => {
    const y = rowStart + i * rowH;
    const items = tierItems[tier] || [];
    const isSTop = tier === 'S';

    ctx.fillStyle = tierBgs[tier];
    ctx.fillRect(24, y, W - 48, rowH - 2);

    ctx.fillStyle = tierColors[tier];
    ctx.fillRect(24, y, isSTop ? 5 : 3, rowH - 2);

    if (isSTop) {
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 18;
    }
    ctx.fillStyle = tierColors[tier];
    ctx.font = '900 56px Orbitron, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(tier, 72, y + rowH - 12);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(108, y + 8, 1, rowH - 18);

    ctx.textAlign = 'left';
    let x = 120;
    const maxX = W - 48;
    const pillY = y + (rowH - pillH) / 2;

    items.forEach(item => {
      const src = getImageSrc(item);
      const imgEl = src ? imageCache[src] : null;
      const label = item.name.toUpperCase();

      ctx.font = '700 10px Orbitron, Arial, sans-serif';
      const textW = ctx.measureText(label).width;

      const hasImg = !!imgEl;
      const pillW = (hasImg ? imgW + 6 : 0) + textW + textPadL + textPadR;

      if (x + pillW > maxX) return;

      ctx.fillStyle = isSTop ? 'rgba(255,0,0,0.1)' : 'rgba(255,255,255,0.07)';
      roundRect(ctx, x, pillY, pillW, pillH, 5);
      ctx.fill();

      ctx.strokeStyle = isSTop ? 'rgba(255,0,0,0.25)' : 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      roundRect(ctx, x, pillY, pillW, pillH, 5);
      ctx.stroke();

      if (hasImg) {
        const imgX = x + 8;
        const imgDrawY = pillY + (pillH - imgH) / 2;
        ctx.save();
        ctx.filter = 'brightness(1.25) contrast(1.1)';
        ctx.globalAlpha = 0.95;
        ctx.drawImage(imgEl, imgX, imgDrawY, imgW, imgH);
        ctx.restore();
      }

      const labelX = x + (hasImg ? imgW + 14 : textPadL);
      ctx.fillStyle = isSTop ? '#ffffff' : 'rgba(255,255,255,0.88)';
      ctx.font = '700 10px Orbitron, Arial, sans-serif';
      ctx.fillText(label, labelX, pillY + pillH / 2 + 4);

      x += pillW + pillGap;
    });

    if (items.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.font = '400 10px "Share Tech Mono", monospace, sans-serif';
      ctx.fillText('EMPTY', 120, y + rowH / 2 + 4);
    }
  });

  const bottomY = rowStart + TIERS.length * rowH + 4;

  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(24, bottomY, W - 48, 1);

  ctx.fillStyle = 'rgba(0,245,255,0.06)';
  ctx.fillRect(24, bottomY + 1, W - 48, H - bottomY - 24);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 20px Orbitron, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CYBERNETICPUNKS.COM', W / 2, bottomY + 36);

  ctx.fillStyle = '#ff8800';
  ctx.font = '700 12px "Share Tech Mono", monospace, sans-serif';
  ctx.fillText('CREATE YOUR OWN MARATHON TIER LIST → /meta', W / 2, bottomY + 56);

  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '400 10px "Share Tech Mono", monospace, sans-serif';
  ctx.fillText('5 EDITORS. 6 SOURCES. EVERY 6 HOURS.', W / 2, bottomY + 72);

  return canvas.toDataURL('image/png');
}

// ─── MAIN COMPONENT ──────────────────────────────────────────

export default function MetaClient({ metaTiers, weapons, shells, modCount, recentPosts }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('live');
  const [liveFilter, setLiveFilter] = useState('all');
  const [usageCount, setUsageCount] = useState(null);
  const [sharedList, setSharedList] = useState(null);
  const [movements, setMovements] = useState({});
  const [countdown, setCountdown] = useState('');
  const [toast, setToast] = useState(false);
  const [filter, setFilter] = useState('weapons');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [unranked, setUnranked] = useState([]);
  const [tierItems, setTierItems] = useState({ S: [], A: [], B: [], C: [], D: [], F: [] });
  const [runnerTag, setRunnerTag] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobilePickTarget, setMobilePickTarget] = useState(null);

  const dragItem = useRef(null);
  const dragSource = useRef(null);

  const weaponTypes = getUniqueWeaponTypes(weapons);

  const sortedTiers = { S: [], A: [], B: [], C: [], D: [], F: [] };
  (metaTiers || []).forEach(item => {
    const t = (item.tier || 'C').toUpperCase();
    if (sortedTiers[t]) sortedTiers[t].push(item);
  });
  const lastUpdated = metaTiers?.length > 0
    ? new Date(metaTiers.reduce((a, b) => a.updated_at > b.updated_at ? a : b).updated_at)
    : null;
  const metaShiftsToday = (metaTiers || []).filter(t => new Date(t.updated_at).getTime() > Date.now() - 86400000).length;
  const weaponMap = {};
  (weapons || []).forEach(w => { weaponMap[w.name.toLowerCase()] = w; });
  const shellMap = {};
  (shells || []).forEach(s => { shellMap[s.name.toLowerCase()] = s; });

  useEffect(() => {
    setCountdown(formatCronCountdown(getSecondsToNextCron()));
    const id = setInterval(() => setCountdown(formatCronCountdown(getSecondsToNextCron())), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    track('meta_view');
  }, []);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const { count } = await supabase
          .from('site_events')
          .select('*', { count: 'exact', head: true })
          .eq('event_name', 'tierlist_share');
        if (count && count > 0) setUsageCount(count);
      } catch (_) {}
    }
    fetchUsage();
  }, []);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
  }, []);

  useEffect(() => {
    const listParam = searchParams.get('list');
    if (listParam) {
      try {
        const decoded = JSON.parse(atob(listParam));
        setSharedList(decoded);
        setActiveTab('builder');
        const newTiers = { S: [], A: [], B: [], C: [], D: [], F: [] };
        (decoded.items || []).forEach(({ n, t }) => {
          const item = buildPoolItems(weapons, shells, 'everything', '').find(i => i.name === n);
          if (item && newTiers[t]) newTiers[t].push(item);
        });
        setTierItems(newTiers);
        setUnranked([]);
        if (decoded.tag) setRunnerTag(decoded.tag);
      } catch (_) {}
    }
  }, [searchParams]);

  useEffect(() => {
    if (!metaTiers?.length) return;
    try {
      const latestUpdate = Math.max(...metaTiers.map(t => new Date(t.updated_at).getTime()));
      const stored = JSON.parse(localStorage.getItem('cp_meta_v1') || 'null');
      const currentMap = {};
      metaTiers.forEach(t => { currentMap[t.name] = t.tier; });

      if (!stored) {
        localStorage.setItem('cp_meta_v1', JSON.stringify({ ts: latestUpdate, map: currentMap }));
        return;
      }

      if (stored.ts < latestUpdate) {
        const mv = {};
        Object.entries(currentMap).forEach(([name, tier]) => {
          const prev = stored.map?.[name];
          if (!prev) { mv[name] = 'new'; }
          else if (TIER_ORDER_MAP[tier] < TIER_ORDER_MAP[prev]) { mv[name] = 'up'; }
          else if (TIER_ORDER_MAP[tier] > TIER_ORDER_MAP[prev]) { mv[name] = 'down'; }
        });
        setMovements(mv);
        setToast(Object.keys(mv).length > 0);
        setTimeout(() => setToast(false), 5000);
        localStorage.setItem('cp_meta_v1', JSON.stringify({ ts: latestUpdate, map: currentMap }));
      }
    } catch (_) {}
  }, [metaTiers]);

  useEffect(() => {
    if (sharedList) return;
    const pool = buildPoolItems(weapons, shells, filter, categoryFilter);
    const placed = new Set(Object.values(tierItems).flat().map(i => i.id));
    setUnranked(pool.filter(i => !placed.has(i.id)));
  }, [filter, categoryFilter, weapons, shells]);

  function moveItem(itemId, sourceZone, destZone) {
    if (sourceZone === destZone) return;
    let item;
    let newUnranked = [...unranked];
    let newTiers = { S: [...tierItems.S], A: [...tierItems.A], B: [...tierItems.B], C: [...tierItems.C], D: [...tierItems.D], F: [...tierItems.F] };

    if (sourceZone === 'unranked') {
      const idx = newUnranked.findIndex(i => i.id === itemId);
      if (idx === -1) return;
      item = newUnranked.splice(idx, 1)[0];
    } else {
      const arr = newTiers[sourceZone];
      const idx = arr.findIndex(i => i.id === itemId);
      if (idx === -1) return;
      item = arr.splice(idx, 1)[0];
    }

    if (destZone === 'unranked') {
      newUnranked.push(item);
    } else {
      newTiers[destZone].push(item);
    }

    setUnranked(newUnranked);
    setTierItems(newTiers);
    setGeneratedImage(null);
    setShareUrl('');
  }

  function resetBuilder() {
    const pool = buildPoolItems(weapons, shells, filter, categoryFilter);
    setUnranked(pool);
    setTierItems({ S: [], A: [], B: [], C: [], D: [], F: [] });
    setGeneratedImage(null);
    setShareUrl('');
    setSharedList(null);
    if (searchParams.get('list')) router.replace('/meta');
  }

  function onDragStart(e, itemId, sourceZone) {
    dragItem.current = itemId;
    dragSource.current = sourceZone;
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function onDrop(e, destZone) {
    e.preventDefault();
    if (dragItem.current) {
      moveItem(dragItem.current, dragSource.current, destZone);
      dragItem.current = null;
      dragSource.current = null;
    }
  }

  function onDragEnd() {
    dragItem.current = null;
    dragSource.current = null;
  }

  function onMobileTap(item, sourceZone) {
    if (!isMobile) return;
    setMobilePickTarget({ item, sourceZone });
  }

  function onMobileAssign(destZone) {
    if (!mobilePickTarget) return;
    moveItem(mobilePickTarget.item.id, mobilePickTarget.sourceZone, destZone);
    setMobilePickTarget(null);
  }

  async function handleGenerate() {
    setIsGenerating(true);
    setGeneratedImage(null);
    try {
      const dataUrl = await generateTierImage(tierItems, runnerTag);
      setGeneratedImage(dataUrl);
      const allPlaced = Object.entries(tierItems).flatMap(([t, items]) =>
        items.map(i => ({ n: i.name, t }))
      );
      const encoded = btoa(JSON.stringify({ tag: runnerTag || 'ANONYMOUS RUNNER', items: allPlaced }));
      setShareUrl(`${window.location.origin}/meta?list=${encoded}`);
    } catch (err) {
      console.error('[generateTierImage] error:', err);
    }
    setIsGenerating(false);
  }

  function handleDownload() {
    if (!generatedImage) return;
    track('tierlist_share');
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `marathon-tier-list-${Date.now()}.png`;
    a.click();
  }

  function handleShareX() {
    const text = `My Marathon weapon tier list 🎯\n\nCreate your own → cyberneticpunks.com/meta\n\n#Marathon #MarathonGame #MarathonTierList`;
    const url = shareUrl || 'https://cyberneticpunks.com/meta';
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  }

  function handleShareReddit() {
    const title = `My Marathon Tier List — Made with CyberneticPunks`;
    const url = shareUrl || 'https://cyberneticpunks.com/meta';
    window.open(`https://www.reddit.com/r/Marathon/submit?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
  }

  function handleCopyLink() {
    const url = shareUrl || window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const placedCount = Object.values(tierItems).flat().length;
  const totalItems = placedCount + unranked.length;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px', fontFamily: 'system-ui, sans-serif' }}>

      <style>{`
        .meta-tier-row:hover { background: #1e2228 !important; }
        .meta-pill:hover     { background: #22252e !important; }
        .meta-btn:hover      { background: #1e2228 !important; }
        .meta-share-btn:hover { background: rgba(255,255,255,0.05) !important; }
      `}</style>

      {toast && (
        <div style={{
          position: 'fixed', top: 64, right: 24, zIndex: 9999,
          background: '#1a1d24', border: '1px solid #22252e',
          borderLeft: '3px solid #00ff41',
          borderRadius: 2, padding: '12px 18px',
          fontSize: 10, fontWeight: 700, color: '#00ff41', letterSpacing: 2,
        }}>
          ↑ TIERS UPDATED — {Object.keys(movements).length} CHANGE{Object.keys(movements).length !== 1 ? 'S' : ''}
        </div>
      )}

      {mobilePickTarget && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 }}
          onClick={() => setMobilePickTarget(null)}
        >
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: 2, fontWeight: 700 }}>
            ASSIGN {mobilePickTarget.item.name.toUpperCase()}
          </div>
          {TIERS.map(t => (
            <button key={t} onClick={e => { e.stopPropagation(); onMobileAssign(t); }} style={{
              width: 280, padding: '14px 0', borderRadius: 2,
              background: TIER_STYLES[t].bg,
              border: '1px solid ' + TIER_STYLES[t].accent + '88',
              color: TIER_STYLES[t].fg, fontSize: 22, fontWeight: 900, letterSpacing: 4,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {t}
            </button>
          ))}
          <button onClick={() => onMobileAssign('unranked')} style={{
            width: 280, padding: '10px 0', borderRadius: 2,
            background: '#1a1d24', border: '1px solid #22252e',
            color: 'rgba(255,255,255,0.4)', fontSize: 10, cursor: 'pointer', letterSpacing: 2, fontFamily: 'inherit',
          }}>
            BACK TO UNRANKED
          </button>
        </div>
      )}

      {/* ══ HEADER ════════════════════════════════════════════ */}
      <section style={{ marginBottom: 28, paddingTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 6px rgba(0,255,65,0.5)' }} />
          <span style={{ fontSize: 10, color: '#00ff41', letterSpacing: 3, fontWeight: 700 }}>NEXUS · LIVE META INTELLIGENCE</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 48px)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1, margin: '0 0 12px', color: '#fff' }}>
              Marathon Meta<br /><span style={{ color: '#00ff41' }}>Tier List</span>
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 520, margin: 0 }}>
              What weapons, shells, and strategies are actually winning in Marathon right now. Updated every 6 hours by NEXUS.
            </p>
          </div>

          {/* Status card */}
          <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #00ff41', borderRadius: '0 0 3px 3px', padding: '14px 18px', minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 6px rgba(0,255,65,0.5)' }} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: '#00ff41' }}>LIVE</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontFamily: 'monospace' }}>
                UPDATED {lastUpdated ? hoursAgo(lastUpdated).toUpperCase() : 'PENDING'}
              </span>
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1.5, fontFamily: 'monospace' }}>
              NEXT CYCLE · <span style={{ color: 'rgba(255,255,255,0.5)' }}>{countdown}</span>
            </div>
            {usageCount && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #22252e', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontFamily: 'monospace' }}>
                <span style={{ color: '#00ff41', fontWeight: 700 }}>{usageCount.toLocaleString()}</span> lists shared
              </div>
            )}
          </div>
        </div>

        {/* Share strip */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, fontFamily: 'monospace', marginRight: 4 }}>SHARE</span>
          {[
            { label: 'X',       action: () => window.open('https://x.com/intent/tweet?text=' + encodeURIComponent('Marathon meta tier list updated — check what weapons and shells are winning') + '&url=' + encodeURIComponent('https://cyberneticpunks.com/meta') + '&hashtags=Marathon,MarathonGame', '_blank') },
            { label: 'REDDIT',  action: () => window.open('https://www.reddit.com/r/Marathon/submit?title=' + encodeURIComponent('CyberneticPunks Marathon Meta Tier List — Updated ' + (lastUpdated ? hoursAgo(lastUpdated) : 'now')) + '&url=' + encodeURIComponent('https://cyberneticpunks.com/meta'), '_blank') },
            { label: 'COPY',    action: () => { navigator.clipboard.writeText('https://cyberneticpunks.com/meta').catch(() => {}); } },
          ].map(btn => (
            <button key={btn.label} className="meta-share-btn" onClick={btn.action} style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 1,
              padding: '5px 12px', borderRadius: 2, cursor: 'pointer',
              background: 'transparent', border: '1px solid #22252e',
              color: 'rgba(255,255,255,0.4)',
              fontFamily: 'inherit', transition: 'background 0.1s',
            }}>
              {btn.label}
            </button>
          ))}
        </div>
      </section>

      {/* ══ STATS STRIP ═══════════════════════════════════════ */}
      <section style={{ marginBottom: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: '#1e2028' }}>
          {[
            { label: 'Weapons Tracked', value: weapons?.length || 0,  color: '#ff2222' },
            { label: 'Shells Ranked',    value: shells?.length  || 0,  color: '#00d4ff' },
            { label: 'Mods Indexed',     value: modCount || 0,         color: '#ff8800' },
            { label: 'Shifts Today',     value: metaShiftsToday,       color: '#00ff41' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: '#1a1d24',
              borderTop: '2px solid ' + stat.color,
              padding: '16px 18px',
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: stat.color, lineHeight: 1, letterSpacing: '-1px', marginBottom: 6 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ TAB BAR ═══════════════════════════════════════════ */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1e2028', marginBottom: 32 }}>
        {[
          { key: 'live',    label: 'LIVE META',     color: '#00ff41' },
          { key: 'builder', label: 'CREATE YOUR OWN', color: '#ff8800' },
        ].map(tab => {
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '12px 24px', background: 'transparent', border: 'none',
              borderBottom: active ? '2px solid ' + tab.color : '2px solid transparent',
              color: active ? '#fff' : 'rgba(255,255,255,0.3)',
              fontSize: 11, fontWeight: 700, letterSpacing: 2,
              cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'inherit',
              transition: 'color 0.1s',
            }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ══ MODE 1: LIVE TIER LIST ══════════════════════════ */}
      {activeTab === 'live' && (
        <section style={{ marginBottom: 56 }}>

          {/* Sub-filter */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid #1e2028', width: 'fit-content' }}>
            {[
              { key: 'all',     label: 'ALL' },
              { key: 'weapons', label: 'WEAPONS' },
              { key: 'shells',  label: 'SHELLS' },
            ].map(opt => {
              const isActive = liveFilter === opt.key;
              return (
                <button key={opt.key} onClick={() => setLiveFilter(opt.key)} style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 2,
                  padding: '8px 18px', background: 'transparent', cursor: 'pointer',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #00ff41' : '2px solid transparent',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.3)',
                  fontFamily: 'inherit',
                }}>
                  {opt.label}
                </button>
              );
            })}
          </div>

          {metaTiers.length === 0 ? (
            <div style={{ padding: '40px 28px', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 12, color: '#00ff41', letterSpacing: 3, marginBottom: 8, fontWeight: 700 }}>NEXUS IS CALIBRATING</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
                Tier list populates automatically every 6 hours.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {TIERS.filter(t => t !== 'F').map(tier => {
                const style = TIER_STYLES[tier];
                const allItems = sortedTiers[tier] || [];
                const items = liveFilter === 'all' ? allItems
                  : liveFilter === 'weapons' ? allItems.filter(i => (i.type || '').toLowerCase() === 'weapon')
                  : allItems.filter(i => (i.type || '').toLowerCase() === 'shell');

                return (
                  <div key={tier}>
                    {/* Tier header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                      {/* Large tier letter block — the "carved" feeling */}
                      <div style={{
                        background: style.bg,
                        color: style.fg,
                        fontSize: 20, fontWeight: 900, letterSpacing: 1,
                        padding: '6px 14px', borderRadius: 2, minWidth: 40, textAlign: 'center',
                        fontFamily: 'Orbitron, monospace',
                      }}>
                        {tier}
                      </div>
                      <div style={{ fontSize: 10, color: style.accent, letterSpacing: 3, fontWeight: 700 }}>{style.label}</div>
                      <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, fontFamily: 'monospace' }}>
                        {items.length} {items.length === 1 ? 'ENTRY' : 'ENTRIES'}
                      </div>
                    </div>

                    {/* Tier items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {items.length === 0 ? (
                        <div style={{ padding: '14px 18px', background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + style.accent, borderRadius: 3, fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 2, fontFamily: 'monospace' }}>
                          NO {style.label} ENTRIES — NEXUS IS TRACKING
                        </div>
                      ) : items.map((item, i) => {
                        const trend = TREND_DISPLAY[item.trend] || TREND_DISPLAY.stable;
                        const typeKey = (item.type || '').toLowerCase();
                        const typeColor = TYPE_COLORS[typeKey] || '#fff';
                        const shellData = typeKey === 'shell' ? shellMap[item.name.toLowerCase()] : null;
                        const weaponData = typeKey === 'weapon' ? weaponMap[item.name.toLowerCase()] : null;
                        const mv = movements[item.name];
                        const imgSrc = getImageSrc(shellData || weaponData, typeKey);

                        return (
                          <div key={i} className="meta-tier-row" style={{
                            background: '#1a1d24', border: '1px solid #22252e',
                            borderLeft: '3px solid ' + style.accent,
                            borderRadius: '0 3px 3px 0', padding: '14px 18px',
                            transition: 'background 0.1s',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>

                              {/* Image / icon */}
                              <div style={{ width: 52, height: 52, flexShrink: 0, background: '#0e1014', border: '1px solid #22252e', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                {imgSrc ? (
                                  <img src={imgSrc} alt={item.name} style={{ width: 46, height: 46, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                                ) : (
                                  <span style={{ fontSize: 22, color: typeColor, opacity: 0.4 }}>
                                    {typeKey === 'shell' ? (SHELL_SYMBOLS[item.name] || '⬠') : getWeaponIcon(weaponData?.weapon_type)}
                                  </span>
                                )}
                              </div>

                              {/* Info */}
                              <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>{item.name}</span>
                                  <span style={{ fontSize: 8, letterSpacing: 2, color: typeColor, background: typeColor + '18', border: '1px solid ' + typeColor + '30', borderRadius: 2, padding: '2px 7px', fontWeight: 700, textTransform: 'uppercase' }}>
                                    {(item.type || '').toUpperCase()}
                                  </span>
                                  {mv === 'up'   && <span style={{ fontSize: 8, color: '#00ff41', background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.2)', borderRadius: 2, padding: '2px 7px', letterSpacing: 1.5, fontWeight: 700 }}>↑ MOVED UP</span>}
                                  {mv === 'down' && <span style={{ fontSize: 8, color: '#ff2222', background: 'rgba(255,34,34,0.08)', border: '1px solid rgba(255,34,34,0.2)', borderRadius: 2, padding: '2px 7px', letterSpacing: 1.5, fontWeight: 700 }}>↓ MOVED DOWN</span>}
                                  {mv === 'new'  && <span style={{ fontSize: 8, color: '#ffd700', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 2, padding: '2px 7px', letterSpacing: 1.5, fontWeight: 700 }}>★ NEW</span>}
                                  {item.ranked_tier_solo  && <span style={{ fontSize: 8, color: '#9b5de5', background: 'rgba(155,93,229,0.08)', border: '1px solid rgba(155,93,229,0.2)', borderRadius: 2, padding: '2px 7px', letterSpacing: 1.5, fontWeight: 700 }}>SOLO {item.ranked_tier_solo}</span>}
                                  {item.ranked_tier_squad && <span style={{ fontSize: 8, color: '#ffd700', background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 2, padding: '2px 7px', letterSpacing: 1.5, fontWeight: 700 }}>SQUAD {item.ranked_tier_squad}</span>}
                                  {item.holotag_tier && <span style={{ fontSize: 8, color: '#ffd700', background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 2, padding: '2px 7px', letterSpacing: 1.5, fontWeight: 700 }}>◈ {item.holotag_tier}</span>}
                                </div>
                                {item.note && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{item.note}</div>}
                                {item.ranked_note && <div style={{ fontSize: 11, color: '#9b5de5', marginTop: 3, opacity: 0.8 }}>◎ {item.ranked_note}</div>}

                                {/* Shell stats row */}
                                {shellData && (
                                  <div style={{ display: 'flex', gap: 12, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap' }}>
                                    {shellData.role && <StatInline label="ROLE" value={shellData.role} />}
                                    {shellData.base_health && <StatInline label="HP" value={shellData.base_health} color="#00ff41" />}
                                    {shellData.base_shield && <StatInline label="SHIELD" value={shellData.base_shield} color="#00d4ff" />}
                                    {shellData.prime_ability_name && <StatInline label="PRIME" value={shellData.prime_ability_name} color="#ff8800" />}
                                    {shellData.tactical_ability_name && <StatInline label="TAC" value={shellData.tactical_ability_name} color="#ff8800" />}
                                  </div>
                                )}
                                {/* Weapon stats row with bars */}
                                {weaponData && (
                                  <div style={{ display: 'flex', gap: 12, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {weaponData.weapon_type && <StatInline label="TYPE" value={weaponData.weapon_type} />}
                                    {weaponData.damage && <StatBar label="DMG" value={weaponData.damage} max={120} color="#ff8800" />}
                                    {weaponData.fire_rate && <StatBar label="RPM" value={weaponData.fire_rate} max={800} color="#00d4ff" />}
                                    {weaponData.range_rating && <StatInline label="RANGE" value={weaponData.range_rating} />}
                                    {weaponData.ranked_viable === false && <StatInline label="RANKED" value="AVOID" color="#ff2222" />}
                                  </div>
                                )}
                              </div>

                              {/* Trend */}
                              <div style={{ fontSize: 10, color: trend.color, whiteSpace: 'nowrap', paddingTop: 4, fontWeight: 700, letterSpacing: 1, fontFamily: 'monospace', flexShrink: 0 }}>
                                {trend.label}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent posts */}
          {recentPosts?.length > 0 && (
            <div style={{ marginTop: 48 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>Intelligence Briefing</span>
                <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
                <Link href="/intel/nexus" style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', letterSpacing: 1, fontWeight: 700, letterSpacing: 2, fontFamily: 'monospace' }}>VIEW FULL SITREP →</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {recentPosts.map((post, i) => {
                  const editorColor = post.editor === 'CIPHER' ? '#ff2222' : '#00d4ff';
                  return (
                    <Link key={i} href={'/intel/' + post.slug} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px',
                      background: '#1a1d24', border: '1px solid #22252e',
                      borderLeft: '3px solid ' + editorColor + '55',
                      borderRadius: '0 3px 3px 0', textDecoration: 'none',
                      transition: 'background 0.1s',
                    }} className="meta-tier-row">
                      <span style={{ width: 6, height: 6, borderRadius: 1, background: editorColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: editorColor, width: 60, letterSpacing: 2, flexShrink: 0 }}>{post.editor}</span>
                      <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{post.headline}</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, flexShrink: 0, fontFamily: 'monospace' }}>{hoursAgo(post.created_at)}</span>
                      {post.tags?.[0] && (
                        <span style={{ fontSize: 8, color: editorColor, background: editorColor + '15', border: '1px solid ' + editorColor + '25', borderRadius: 2, padding: '2px 7px', flexShrink: 0, letterSpacing: 1.5, fontWeight: 700 }}>{post.tags[0]}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Methodology */}
          <div style={{ marginTop: 32, background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #00d4ff', borderRadius: '0 0 3px 3px', padding: '20px 22px' }}>
            <h3 style={{ fontSize: 10, fontWeight: 700, color: '#00d4ff', letterSpacing: 3, marginBottom: 8, margin: 0, textTransform: 'uppercase' }}>How we rank the meta</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, margin: '8px 0 0' }}>
              Rankings are generated by NEXUS (meta tracking) and CIPHER (competitive analysis) every 6 hours. Data sources include YouTube gameplay analysis, Reddit community sentiment from r/Marathon, and Bungie official communications. Stat overlays are pulled from our verified shell and weapon database. Trends indicate movement over the past 48 hours.
            </p>
          </div>

          {/* DEXTER CTA */}
          <div style={{
            marginTop: 24, background: '#1a1d24', border: '1px solid #22252e',
            borderTop: '2px solid #ff8800', borderRadius: '0 0 3px 3px',
            padding: '22px 24px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#ff8800', letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase' }}>Not sure what to run?</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 460 }}>
                DEXTER engineers a complete loadout in seconds — shell, weapons, mods, cores, and implants tuned to your playstyle.
              </div>
            </div>
            <Link href="/advisor" style={{
              padding: '11px 22px', background: '#ff8800', color: '#000',
              fontSize: 11, fontWeight: 800, letterSpacing: 1, borderRadius: 2,
              textDecoration: 'none', flexShrink: 0,
            }}>
              GET YOUR BUILD →
            </Link>
          </div>

        </section>
      )}

      {/* ══ MODE 2: BUILDER ══════════════════════════════════ */}
      {activeTab === 'builder' && (
        <section style={{ marginBottom: 56 }}>

          {sharedList && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', marginBottom: 16,
              background: '#1a1d24', border: '1px solid #22252e',
              borderLeft: '3px solid #ff8800', borderRadius: '0 3px 3px 0',
            }}>
              <span style={{ fontSize: 10, color: '#ff8800', letterSpacing: 2, fontWeight: 700 }}>
                VIEWING SHARED TIER LIST · {(sharedList.tag || 'ANONYMOUS RUNNER').toUpperCase()}
              </span>
              <button onClick={resetBuilder} style={{
                fontSize: 9, color: '#ff8800', fontWeight: 700,
                background: 'transparent', border: '1px solid #ff880040',
                borderRadius: 2, padding: '5px 11px', cursor: 'pointer', letterSpacing: 1, fontFamily: 'inherit',
              }}>
                CREATE YOUR OWN →
              </button>
            </div>
          )}

          {!sharedList && (
            <>
              {/* What to rank */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, marginBottom: 8, fontWeight: 700, textTransform: 'uppercase' }}>What are you ranking?</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { key: 'weapons',    label: 'ALL WEAPONS' },
                    { key: 'shells',     label: 'SHELLS ONLY' },
                    { key: 'everything', label: 'WEAPONS + SHELLS' },
                    ...weaponTypes.map(t => ({ key: 'category|' + t, label: t })),
                  ].map(opt => {
                    const isCategory = opt.key.startsWith('category|');
                    const filterKey = isCategory ? 'category' : opt.key;
                    const catKey = isCategory ? opt.key.split('|')[1] : '';
                    const active = filter === filterKey && (!isCategory || categoryFilter === catKey);
                    return (
                      <button key={opt.key} onClick={() => { setFilter(filterKey); setCategoryFilter(catKey); setGeneratedImage(null); }} style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
                        padding: '6px 12px', borderRadius: 2, cursor: 'pointer',
                        background: active ? 'rgba(0,255,65,0.1)' : 'transparent',
                        border: '1px solid ' + (active ? 'rgba(0,255,65,0.3)' : '#22252e'),
                        color: active ? '#00ff41' : 'rgba(255,255,255,0.4)',
                        fontFamily: 'inherit',
                      }}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Runner tag + actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 240, background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, padding: '7px 12px' }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, flexShrink: 0, fontWeight: 700 }}>RUNNER TAG</span>
                  <input
                    value={runnerTag}
                    onChange={e => setRunnerTag(e.target.value)}
                    placeholder="YOUR GAMERTAG"
                    maxLength={32}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 11, color: '#fff', letterSpacing: 1, fontFamily: 'Orbitron, monospace' }}
                  />
                </div>
                <button onClick={resetBuilder} className="meta-btn" style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
                  padding: '8px 14px', borderRadius: 2, cursor: 'pointer',
                  background: 'transparent', border: '1px solid #22252e',
                  color: 'rgba(255,255,255,0.35)', fontFamily: 'inherit',
                }}>RESET</button>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontFamily: 'monospace' }}>
                  {placedCount} / {totalItems} PLACED
                </div>
              </div>
            </>
          )}

          {/* Tier rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 22 }}>
            {TIERS.map(tier => {
              const style = TIER_STYLES[tier];
              const items = tierItems[tier] || [];
              return (
                <div key={tier}
                  onDragOver={onDragOver}
                  onDrop={e => onDrop(e, tier)}
                  style={{
                    display: 'flex', alignItems: 'stretch', gap: 0,
                    background: '#1a1d24', border: '1px solid #22252e',
                    borderLeft: '3px solid ' + style.accent,
                    borderRadius: '0 3px 3px 0', minHeight: 60,
                  }}
                >
                  <div style={{
                    width: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: style.bg, color: style.fg,
                  }}>
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, letterSpacing: 1 }}>{tier}</span>
                  </div>
                  <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start' }}>
                    {items.length === 0 && (
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.12)', letterSpacing: 2, alignSelf: 'center', fontWeight: 700, fontFamily: 'monospace' }}>
                        {sharedList ? 'EMPTY' : (isMobile ? 'TAP AN ITEM TO ASSIGN' : 'DRAG ITEMS HERE')}
                      </span>
                    )}
                    {items.map(item => (
                      <TierPill key={item.id} item={item} zone={tier}
                        onDragStart={onDragStart} onDragEnd={onDragEnd}
                        onClick={isMobile ? () => onMobileTap(item, tier) : undefined}
                        draggable={!sharedList}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unranked pool */}
          {!sharedList && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}>
                  Unranked Pool · {unranked.length} items
                </span>
                <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: 1, fontFamily: 'monospace' }}>
                  {isMobile ? 'TAP TO ASSIGN' : 'DRAG INTO TIERS'}
                </span>
              </div>
              <div
                onDragOver={onDragOver}
                onDrop={e => onDrop(e, 'unranked')}
                style={{
                  background: '#0e1014', border: '1px solid #22252e', borderRadius: 3, padding: 10,
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6,
                  minHeight: 80,
                }}
              >
                {unranked.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: 10, color: '#00ff41', letterSpacing: 2, padding: '16px 0', fontWeight: 700 }}>
                    ALL ITEMS RANKED ✓
                  </div>
                ) : unranked.map(item => (
                  <PoolCard key={item.id} item={item}
                    onDragStart={onDragStart} onDragEnd={onDragEnd}
                    onClick={isMobile ? () => onMobileTap(item, 'unranked') : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Generate + Share */}
          <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #ff8800', borderRadius: '0 0 3px 3px', padding: '22px 24px' }}>
            <div style={{ fontSize: 10, color: '#ff8800', letterSpacing: 3, marginBottom: 14, fontWeight: 700, textTransform: 'uppercase' }}>
              Generate + Share Your Tier List
            </div>

            {!generatedImage ? (
              <button
                onClick={handleGenerate}
                disabled={isGenerating || placedCount === 0}
                style={{
                  fontSize: 12, fontWeight: 800, letterSpacing: 1.5,
                  padding: '14px 28px', borderRadius: 2, cursor: placedCount === 0 ? 'not-allowed' : 'pointer',
                  background: placedCount === 0 ? '#1e2028' : '#ff8800',
                  color: placedCount === 0 ? 'rgba(255,255,255,0.25)' : '#000',
                  border: placedCount === 0 ? '1px solid #22252e' : 'none',
                  width: '100%', fontFamily: 'inherit',
                }}
              >
                {isGenerating ? 'GENERATING...' : placedCount === 0 ? 'ADD ITEMS TO TIERS FIRST' : 'GENERATE TIER LIST IMAGE'}
              </button>
            ) : (
              <div>
                <img src={generatedImage} alt="Your Marathon Tier List" style={{ width: '100%', borderRadius: 2, marginBottom: 14, border: '1px solid #22252e' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
                  {[
                    { label: 'POST TO X',       action: handleShareX,      color: '#fff' },
                    { label: 'POST TO REDDIT',  action: handleShareReddit, color: '#ff4500' },
                    { label: copied ? 'COPIED!' : 'COPY LINK', action: handleCopyLink, color: '#00d4ff' },
                    { label: 'DOWNLOAD',        action: handleDownload,    color: '#00ff41' },
                  ].map(btn => (
                    <button key={btn.label} onClick={btn.action} style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
                      padding: '10px 0', borderRadius: 2, cursor: 'pointer',
                      background: 'transparent', border: '1px solid ' + btn.color + '30',
                      color: btn.color, fontFamily: 'inherit',
                    }}>
                      {btn.label}
                    </button>
                  ))}
                </div>
                {shareUrl && (
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, wordBreak: 'break-all', background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, padding: '8px 10px', marginBottom: 8, fontFamily: 'monospace' }}>
                    {shareUrl.length > 80 ? shareUrl.slice(0, 80) + '…' : shareUrl}
                  </div>
                )}
                <button onClick={() => { setGeneratedImage(null); setShareUrl(''); }} style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: 1,
                  padding: '7px 14px', borderRadius: 2, cursor: 'pointer',
                  background: 'transparent', border: '1px solid #22252e',
                  color: 'rgba(255,255,255,0.3)', fontFamily: 'inherit',
                }}>
                  ← EDIT TIER LIST
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      <Link href="/" style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', fontFamily: 'monospace', fontWeight: 700 }}>
        ← BACK TO THE GRID
      </Link>
    </div>
  );
}

// ─── PILL / CARD COMPONENTS ──────────────────────────────────

function TierPill({ item, zone, onDragStart, onDragEnd, onClick, draggable = true }) {
  const icon = item.kind === 'shell' ? (SHELL_SYMBOLS[item.name] || '⬠') : getWeaponIcon(item.raw?.weapon_type);
  const imgSrc = getImageSrc(item);
  return (
    <div
      className="meta-pill"
      draggable={draggable}
      onDragStart={draggable ? e => onDragStart(e, item.id, zone) : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      onClick={onClick}
      title={item.subtext}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 2,
        background: '#0e1014', border: '1px solid #22252e',
        cursor: draggable ? 'grab' : 'default',
        userSelect: 'none', transition: 'background 0.1s',
      }}
    >
      {imgSrc ? (
        <img src={imgSrc} alt={item.name}
          style={{ width: 24, height: 16, objectFit: 'contain', flexShrink: 0 }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      ) : (
        <span style={{ fontSize: 12, opacity: 0.4, lineHeight: 1 }}>{icon}</span>
      )}
      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
        {item.name}
      </span>
    </div>
  );
}

function PoolCard({ item, onDragStart, onDragEnd, onClick }) {
  const icon = item.kind === 'shell' ? (SHELL_SYMBOLS[item.name] || '⬠') : getWeaponIcon(item.raw?.weapon_type);
  const imgSrc = getImageSrc(item);
  return (
    <div
      className="meta-pill"
      draggable
      onDragStart={e => onDragStart(e, item.id, 'unranked')}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{
        background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2,
        padding: '9px 10px', cursor: 'grab', userSelect: 'none',
        transition: 'background 0.1s',
      }}
    >
      {imgSrc ? (
        <img src={imgSrc} alt={item.name}
          style={{ width: '100%', height: 40, objectFit: 'contain', marginBottom: 5 }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      ) : (
        <div style={{ fontSize: 18, opacity: 0.3, marginBottom: 5, lineHeight: 1 }}>{icon}</div>
      )}
      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5, marginBottom: 3 }}>
        {item.name}
      </div>
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>
        {item.subtext}
      </div>
    </div>
  );
}

function StatInline({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.22)', letterSpacing: 1.5, fontWeight: 700, fontFamily: 'monospace' }}>{label}</span>
      <span style={{ fontSize: 10, color: color || 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function StatBar({ label, value, max, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 100 }}>
      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.22)', letterSpacing: 1.5, fontWeight: 700, fontFamily: 'monospace' }}>{label}</span>
      <div style={{ width: 40, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 1 }} />
      </div>
      <span style={{ fontSize: 10, color, fontWeight: 700, fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}
'use client';

// app/meta/MetaClient.js
// Mode 1: Enhanced NEXUS live tier list with movement badges + countdown
// Mode 2: Interactive drag-and-drop tier list builder with image generation + sharing

import { useState, useEffect, useRef, useCallback } from 'react';
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
  S: { bg: 'rgba(255,0,0,0.06)',     color: '#ff0000', border: 'rgba(255,0,0,0.2)',           label: 'DOMINANT' },
  A: { bg: 'rgba(255,136,0,0.05)',   color: '#ff8800', border: 'rgba(255,136,0,0.12)',         label: 'STRONG'   },
  B: { bg: 'rgba(0,245,255,0.04)',   color: '#00f5ff', border: 'rgba(0,245,255,0.08)',         label: 'VIABLE'   },
  C: { bg: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.35)', border: 'rgba(255,255,255,0.05)', label: 'WEAK'  },
  D: { bg: 'rgba(255,255,255,0.01)', color: 'rgba(255,255,255,0.2)',  border: 'rgba(255,255,255,0.03)', label: 'AVOID' },
  F: { bg: 'rgba(255,0,0,0.015)',    color: 'rgba(255,0,0,0.25)',     border: 'rgba(255,0,0,0.06)',     label: 'F TIER' },
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
  up:     { label: '▲ RISING',  color: '#00ff88' },
  down:   { label: '▼ FALLING', color: '#ff0000' },
  stable: { label: '● STABLE',  color: 'rgba(255,255,255,0.25)' },
};

const TYPE_COLORS = {
  strategy: '#9b5de5', weapon: '#ff0000',
  loadout: '#ff8800', shell: '#00f5ff', ability: '#ffd700',
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

  ctx.fillStyle = 'rgba(0,245,255,0.005)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);

  ctx.strokeStyle = 'rgba(0,245,255,0.012)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  ctx.fillStyle = '#ff0000';
  ctx.beginPath(); ctx.arc(36, 36, 5, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '700 13px Orbitron, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CYBERNETICPUNKS', 50, 41);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '900 22px Orbitron, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('MARATHON TIER LIST', W - 32, 36);

  const tag = runnerTag?.trim() || 'ANONYMOUS RUNNER';
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.font = '400 11px "Share Tech Mono", monospace, sans-serif';
  ctx.fillText('by ' + tag.toUpperCase(), W - 32, 54);

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(24, 66, W - 48, 1);

  const rowStart = 74;
  const rowH = 71;
  const tierColors = {
    S: '#ff0000', A: '#ff8800', B: '#00f5ff',
    C: 'rgba(200,200,200,0.4)', D: 'rgba(150,150,150,0.25)', F: 'rgba(255,0,0,0.25)',
  };
  const tierBgs = {
    S: 'rgba(255,0,0,0.07)', A: 'rgba(255,136,0,0.05)', B: 'rgba(0,245,255,0.04)',
    C: 'rgba(255,255,255,0.02)', D: 'rgba(255,255,255,0.01)', F: 'rgba(255,0,0,0.015)',
  };

  const pillH = 44;
  const pillGap = 6;
  const imgW = 40, imgH = 28;
  const textPadL = 10, textPadR = 14;

  TIERS.forEach((tier, i) => {
    const y = rowStart + i * rowH;
    const items = tierItems[tier] || [];

    ctx.fillStyle = tierBgs[tier];
    ctx.fillRect(24, y, W - 48, rowH - 2);

    ctx.fillStyle = tierColors[tier];
    ctx.fillRect(24, y, 3, rowH - 2);

    ctx.fillStyle = tierColors[tier];
    ctx.font = '900 30px Orbitron, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(tier, 66, y + 44);

    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(96, y + 8, 1, rowH - 18);

    ctx.textAlign = 'left';
    let x = 108;
    const maxX = W - 48;
    const pillY = y + (rowH - pillH) / 2;

    items.forEach(item => {
      const src = getImageSrc(item);
      const imgEl = src ? imageCache[src] : null;
      const label = item.name;

      ctx.font = '700 10px Orbitron, Arial, sans-serif';
      const textW = ctx.measureText(label).width;

      const hasImg = !!imgEl;
      const pillW = (hasImg ? imgW + 6 : 0) + textW + textPadL + textPadR;

      if (x + pillW > maxX) return;

      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      roundRect(ctx, x, pillY, pillW, pillH, 5);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      roundRect(ctx, x, pillY, pillW, pillH, 5);
      ctx.stroke();

      if (hasImg) {
        const imgX = x + 8;
        const imgDrawY = pillY + (pillH - imgH) / 2;
        ctx.globalAlpha = 0.85;
        ctx.drawImage(imgEl, imgX, imgDrawY, imgW, imgH);
        ctx.globalAlpha = 1;
      }

      const labelX = x + (hasImg ? imgW + 14 : textPadL);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '700 10px Orbitron, Arial, sans-serif';
      ctx.fillText(label, labelX, pillY + pillH / 2 + 4);

      x += pillW + pillGap;
    });

    if (items.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.font = '400 10px "Share Tech Mono", monospace, sans-serif';
      ctx.fillText('EMPTY', 108, y + 40);
    }
  });

  const bottomY = rowStart + TIERS.length * rowH + 2;

  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(24, bottomY, W - 48, 1);

  ctx.fillStyle = 'rgba(0,245,255,0.04)';
  ctx.fillRect(24, bottomY + 2, W - 48, H - bottomY - 26);

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '700 17px Orbitron, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CYBERNETICPUNKS.COM', W / 2, bottomY + 34);

  ctx.fillStyle = 'rgba(0,245,255,0.6)';
  ctx.font = '400 11px "Share Tech Mono", monospace, sans-serif';
  ctx.fillText('CREATE YOUR OWN MARATHON TIER LIST → /meta', W / 2, bottomY + 54);

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.font = '400 10px "Share Tech Mono", monospace, sans-serif';
  ctx.fillText('5 EDITORS. 6 SOURCES. EVERY 6 HOURS.', W / 2, bottomY + 72);

  return canvas.toDataURL('image/png');
}

// ─── MAIN COMPONENT ──────────────────────────────────────────

export default function MetaClient({ metaTiers, weapons, shells, modCount, recentPosts }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('live');
  const [liveFilter, setLiveFilter] = useState('all'); // 'all' | 'weapons' | 'shells'
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

  // ── EFFECTS ──

  // Countdown ticker
  useEffect(() => {
    setCountdown(formatCronCountdown(getSecondsToNextCron()));
    const id = setInterval(() => setCountdown(formatCronCountdown(getSecondsToNextCron())), 1000);
    return () => clearInterval(id);
  }, []);

  // ── TRACK META VIEW ──
  useEffect(() => {
    track('meta_view');
  }, []);

  // Usage count fetch
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

  // Mobile detection
  useEffect(() => {
    setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
  }, []);

  // URL param — shared list
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

  // Tier movement badges
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

  // Rebuild unranked pool when filter changes
  useEffect(() => {
    if (sharedList) return;
    const pool = buildPoolItems(weapons, shells, filter, categoryFilter);
    const placed = new Set(Object.values(tierItems).flat().map(i => i.id));
    setUnranked(pool.filter(i => !placed.has(i.id)));
  }, [filter, categoryFilter, weapons, shells]);

  // ── BUILDER ACTIONS ──

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
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>

      {toast && (
        <div style={{
          position: 'fixed', top: 90, right: 24, zIndex: 9999,
          background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.3)',
          borderRadius: 8, padding: '12px 20px',
          fontFamily: 'Share Tech Mono, monospace', fontSize: 11,
          color: '#00ff88', letterSpacing: 2,
        }}>
          ▲ TIERS UPDATED — {Object.keys(movements).length} CHANGE{Object.keys(movements).length !== 1 ? 'S' : ''}
        </div>
      )}

      {mobilePickTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}
          onClick={() => setMobilePickTarget(null)}
        >
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, color: '#fff', marginBottom: 8 }}>
            ASSIGN {mobilePickTarget.item.name.toUpperCase()}
          </div>
          {TIERS.map(t => (
            <button key={t} onClick={e => { e.stopPropagation(); onMobileAssign(t); }} style={{
              width: 280, padding: '14px 0', borderRadius: 8,
              background: TIER_STYLES[t]?.bg, border: `1px solid ${TIER_STYLES[t]?.color}55`,
              color: TIER_STYLES[t]?.color, fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 900,
              cursor: 'pointer', letterSpacing: 4,
            }}>
              {t}
            </button>
          ))}
          <button onClick={() => onMobileAssign('unranked')} style={{
            width: 280, padding: '10px 0', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.4)', fontFamily: 'Share Tech Mono, monospace', fontSize: 11,
            cursor: 'pointer', letterSpacing: 2,
          }}>
            BACK TO UNRANKED
          </button>
        </div>
      )}

      {/* ── HEADER ── */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00f5ff', boxShadow: '0 0 10px #00f5ff', animation: 'pulse-glow 2s infinite' }} />
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#00f5ff', letterSpacing: 3 }}>⬡ NEXUS — LIVE META INTELLIGENCE</span>
        </div>

        {usageCount && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.2)', borderRadius: 20, marginBottom: 16 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00f5ff', animation: 'pulse-glow 2s ease-in-out infinite' }} />
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#00f5ff', letterSpacing: 2 }}>
              {usageCount.toLocaleString()} TIER LISTS SHARED BY RUNNERS
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 12 }}>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 36, fontWeight: 900, letterSpacing: 2, margin: 0 }}>
            MARATHON META <span style={{ color: '#ff0000' }}>TIER LIST</span>
          </h1>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 }}>
              LAST UPDATED: <span style={{ color: '#00f5ff' }}>{lastUpdated ? hoursAgo(lastUpdated) : 'PENDING'}</span>
            </div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginTop: 4 }}>
              NEXT UPDATE IN: <span style={{ color: 'rgba(255,255,255,0.4)' }}>{countdown}</span>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: 'linear-gradient(90deg, #00f5ff44, #00f5ff11, transparent)', marginBottom: 16 }} />

        <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 17, color: 'rgba(255,255,255,0.45)', maxWidth: 700, lineHeight: 1.6, margin: 0 }}>
          What weapons, shells, and strategies are actually winning in Marathon right now.
        </p>
      </section>

      {/* ── STATS STRIP ── */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'WEAPONS TRACKED',   value: weapons?.length || 0,  color: '#ff0000' },
            { label: 'SHELLS RANKED',      value: shells?.length  || 0,  color: '#00f5ff' },
            { label: 'MODS INDEXED',       value: modCount || 0,         color: '#ff8800' },
            { label: 'META SHIFTS TODAY',  value: metaShiftsToday,       color: '#00ff88' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.08)',
              borderTop: '2px solid ' + stat.color + '44', borderRadius: 8,
              padding: '18px 20px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 28, fontWeight: 900, color: stat.color, lineHeight: 1, marginBottom: 8 }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TAB BAR ── */}
      <div style={{
        display: 'flex', gap: 4,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10, padding: 4, marginBottom: 32,
      }}>
        {[
          { key: 'live',    label: '⬡ NEXUS LIVE META',   color: '#00f5ff' },
          { key: 'builder', label: '✎ CREATE YOUR OWN',  color: '#ff8800' },
        ].map(tab => {
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              flex: 1, padding: '12px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: active ? (tab.color + '18') : 'transparent',
              borderBottom: active ? `2px solid ${tab.color}` : '2px solid transparent',
              color: active ? tab.color : 'rgba(255,255,255,0.3)',
              fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, letterSpacing: 2,
              transition: 'all 0.2s',
            }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* MODE 1: NEXUS LIVE TIER LIST */}
      {activeTab === 'live' && (
        <section style={{ marginBottom: 64 }}>

          {/* WEAPONS / SHELLS / ALL toggle */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 4, width: 'fit-content' }}>
            {[
              { key: 'all',     label: 'ALL',     color: '#fff'    },
              { key: 'weapons', label: 'WEAPONS', color: '#ff0000' },
              { key: 'shells',  label: 'SHELLS',  color: '#00f5ff' },
            ].map(function(opt) {
              const isActive = liveFilter === opt.key;
              return (
                <button key={opt.key} onClick={() => setLiveFilter(opt.key)} style={{
                  fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, letterSpacing: 2,
                  padding: '8px 20px', borderRadius: 5, border: 'none', cursor: 'pointer',
                  background: isActive ? opt.color + '18' : 'transparent',
                  borderBottom: isActive ? '2px solid ' + opt.color : '2px solid transparent',
                  color: isActive ? opt.color : 'rgba(255,255,255,0.28)',
                  transition: 'all 0.15s',
                }}>
                  {opt.label}
                </button>
              );
            })}
          </div>

          {metaTiers.length === 0 ? (
            <div style={{
              padding: '40px 28px', background: 'rgba(0,245,255,0.02)',
              border: '1px solid rgba(0,245,255,0.08)', borderRadius: 10,
              textAlign: 'center', marginBottom: 32,
            }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, color: '#00f5ff', letterSpacing: 2, marginBottom: 8 }}>⬡ NEXUS IS CALIBRATING</div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.3)' }}>
                Tier list populates automatically every 6 hours.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {TIERS.filter(t => t !== 'F').map(tier => {
                const style = TIER_STYLES[tier];
                const allItems = sortedTiers[tier] || [];
                const items = liveFilter === 'all' ? allItems
                  : liveFilter === 'weapons' ? allItems.filter(function(i) { return (i.type || '').toLowerCase() === 'weapon'; })
                  : allItems.filter(function(i) { return (i.type || '').toLowerCase() === 'shell'; });
                const isSTop = tier === 'S';
                return (
                  <div key={tier} style={isSTop ? { filter: 'drop-shadow(0 0 8px rgba(255,0,0,0.08))' } : {}}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{
                        fontFamily: 'Orbitron, monospace', fontSize: 28, fontWeight: 900,
                        color: style.color, width: 48, textAlign: 'center',
                        textShadow: isSTop ? '0 0 20px rgba(255,0,0,0.5)' : 'none',
                      }}>{tier}</div>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: style.color, letterSpacing: 2, opacity: 0.7 }}>{style.label}</div>
                      <div style={{ flex: 1, height: 1, background: isSTop ? 'linear-gradient(90deg, rgba(255,0,0,0.4), rgba(255,0,0,0.05))' : style.border }} />
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>
                        {items.length} {items.length === 1 ? 'ENTRY' : 'ENTRIES'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 60 }}>
                      {items.length === 0 ? (
                        <div style={{
                          padding: '14px 20px', background: style.bg,
                          border: '1px dashed ' + style.border, borderRadius: 8,
                          fontFamily: 'Share Tech Mono, monospace', fontSize: 10,
                          color: 'rgba(255,255,255,0.12)', letterSpacing: 1,
                        }}>
                          NO {style.label} ENTRIES — NEXUS IS TRACKING
                        </div>
                      ) : items.map((item, i) => {
                        const trend = TREND_DISPLAY[item.trend] || TREND_DISPLAY.stable;
                        const typeKey = (item.type || '').toLowerCase();
                        const typeColor = TYPE_COLORS[typeKey] || '#fff';
                        const shellData = typeKey === 'shell' ? shellMap[item.name.toLowerCase()] : null;
                        const weaponData = typeKey === 'weapon' ? weaponMap[item.name.toLowerCase()] : null;
                        const mv = movements[item.name];

                        return (
                          <div key={i} style={{
                            background: style.bg, border: '1px solid ' + style.border,
                            borderLeft: '3px solid ' + style.color, borderRadius: 8,
                            padding: '16px 20px',
                            boxShadow: isSTop ? '0 0 24px rgba(255,0,0,0.12)' : 'none',
                            position: 'relative', overflow: 'hidden',
                          }}>
                            {isSTop && (
                              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,0,0,0.3), transparent)' }} />
                            )}

                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                              {(() => {
                                const imgSrc = getImageSrc(shellData || weaponData, typeKey);
                                return imgSrc ? (
                                  <img src={imgSrc} alt={item.name}
                                    style={{ width: 40, height: 28, objectFit: 'contain', flexShrink: 0, opacity: 0.85 }}
                                    onError={e => { e.target.style.display = 'none'; }}
                                  />
                                ) : (
                                  <div style={{
                                    fontFamily: 'monospace', fontSize: 20, width: 28, textAlign: 'center',
                                    color: typeColor, opacity: 0.5, flexShrink: 0, lineHeight: 1, marginTop: 2,
                                  }}>
                                    {typeKey === 'shell' ? (SHELL_SYMBOLS[item.name] || '⬠') : getWeaponIcon(weaponData?.weapon_type)}
                                  </div>
                                );
                              })()}

                              <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 700, color: '#fff' }}>{item.name}</span>
                                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, letterSpacing: 1, color: typeColor, background: typeColor + '15', borderRadius: 4, padding: '2px 8px' }}>
                                    {(item.type || '').toUpperCase()}
                                  </span>
                                  {mv === 'up'  && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#00ff88', background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.25)', borderRadius: 4, padding: '2px 8px', letterSpacing: 1 }}>▲ MOVED UP</span>}
                                  {mv === 'down' && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff0000', background: 'rgba(255,0,0,0.12)', border: '1px solid rgba(255,0,0,0.25)', borderRadius: 4, padding: '2px 8px', letterSpacing: 1 }}>▼ MOVED DOWN</span>}
                                  {mv === 'new'  && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ffd700', background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 4, padding: '2px 8px', letterSpacing: 1 }}>★ NEW</span>}
                                  {item.ranked_tier_solo  && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#9b5de5', background: 'rgba(155,93,229,0.12)', borderRadius: 4, padding: '2px 8px', letterSpacing: 1 }}>SOLO {item.ranked_tier_solo}</span>}
                                  {item.ranked_tier_squad && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ffd700', background: 'rgba(255,215,0,0.1)', borderRadius: 4, padding: '2px 8px', letterSpacing: 1 }}>SQUAD {item.ranked_tier_squad}</span>}
                                  {item.holotag_tier && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ffd700', background: 'rgba(255,215,0,0.08)', borderRadius: 4, padding: '2px 8px', letterSpacing: 1 }}>◈ {item.holotag_tier}</span>}
                                </div>
                                {item.note && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{item.note}</div>}
                                {item.ranked_note && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: '#9b5de5', marginTop: 4, opacity: 0.8 }}>◎ {item.ranked_note}</div>}
                              </div>

                              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: trend.color, whiteSpace: 'nowrap', paddingTop: 2 }}>{trend.label}</div>
                            </div>

                            {shellData && (
                              <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap' }}>
                                {shellData.role && <StatPill label="ROLE" value={shellData.role} color="#00f5ff" />}
                                {shellData.base_health && <StatPill label="HP" value={shellData.base_health} color="#00ff88" />}
                                {shellData.base_shield && <StatPill label="SHIELD" value={shellData.base_shield} color="#00f5ff" />}
                                {shellData.prime_ability_name && <StatPill label="PRIME" value={shellData.prime_ability_name} color="#ff8800" />}
                                {shellData.tactical_ability_name && <StatPill label="TACTICAL" value={shellData.tactical_ability_name} color="#ff8800" />}
                              </div>
                            )}
                            {weaponData && (
                              <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap' }}>
                                {weaponData.weapon_type && <StatPill label="TYPE" value={weaponData.weapon_type} color="#ff0000" />}
                                {weaponData.damage     && <StatPill label="DMG" value={weaponData.damage} color="#ff8800" />}
                                {weaponData.fire_rate  && <StatPill label="RPM" value={weaponData.fire_rate} color="#ffd700" />}
                                {weaponData.range_rating && <StatPill label="RANGE" value={weaponData.range_rating} color="#00f5ff" />}
                                {weaponData.ranked_viable === false && <StatPill label="RANKED" value="AVOID" color="#ff0000" />}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {recentPosts?.length > 0 && (
            <div style={{ marginTop: 64 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: 2, margin: 0 }}>NEXUS INTELLIGENCE BRIEFING</h2>
                <Link href="/intel/nexus" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#00f5ff', textDecoration: 'none', letterSpacing: 2 }}>VIEW FULL SITREP →</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentPosts.map((post, i) => {
                  const editorColor = post.editor === 'CIPHER' ? '#ff0000' : '#00f5ff';
                  const editorSymbol = post.editor === 'CIPHER' ? '◈' : '⬡';
                  return (
                    <Link key={i} href={'/intel/' + post.slug} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 18px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderLeft: '3px solid ' + editorColor + '44',
                      borderRadius: 8, textDecoration: 'none',
                    }}>
                      <span style={{ color: editorColor, opacity: 0.7, fontSize: 14 }}>{editorSymbol}</span>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: editorColor, width: 64, letterSpacing: 1, flexShrink: 0 }}>{post.editor}</span>
                      <span style={{ flex: 1, fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.8)' }}>{post.headline}</span>
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, flexShrink: 0 }}>{hoursAgo(post.created_at)}</span>
                      {post.tags?.[0] && (
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: editorColor, background: editorColor + '12', borderRadius: 4, padding: '3px 8px', flexShrink: 0, letterSpacing: 1 }}>{post.tags[0]}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ marginTop: 48, background: 'rgba(0,245,255,0.02)', border: '1px solid rgba(0,245,255,0.07)', borderRadius: 10, padding: '24px 28px' }}>
            <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#00f5ff', letterSpacing: 2, marginBottom: 10 }}>HOW WE RANK THE META</h3>
            <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>
              Rankings are generated by NEXUS (meta tracking) and CIPHER (competitive analysis) every 6 hours. Data sources include YouTube gameplay analysis, Reddit community sentiment from r/Marathon, and Bungie official communications. Stat overlays are pulled from our verified shell and weapon database. Trends indicate movement over the past 48 hours.
            </p>
          </div>
        </section>
      )}

      {/* MODE 2: INTERACTIVE BUILDER */}
      {activeTab === 'builder' && (
        <section style={{ marginBottom: 64 }}>
          {sharedList && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px', marginBottom: 20,
              background: 'rgba(255,136,0,0.08)', border: '1px solid rgba(255,136,0,0.2)',
              borderRadius: 8,
            }}>
              <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,136,0,0.7)', letterSpacing: 2 }}>
                VIEWING SHARED TIER LIST BY {(sharedList.tag || 'ANONYMOUS RUNNER').toUpperCase()}
              </span>
              <button onClick={resetBuilder} style={{
                fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff8800',
                background: 'rgba(255,136,0,0.1)', border: '1px solid rgba(255,136,0,0.2)',
                borderRadius: 4, padding: '4px 12px', cursor: 'pointer', letterSpacing: 1,
              }}>
                CREATE YOUR OWN →
              </button>
            </div>
          )}

          {!sharedList && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginBottom: 10 }}>WHAT ARE YOU RANKING?</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                      fontFamily: 'Share Tech Mono, monospace', fontSize: 9, letterSpacing: 1,
                      padding: '6px 14px', borderRadius: 4, cursor: 'pointer',
                      background: active ? 'rgba(0,245,255,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? 'rgba(0,245,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      color: active ? '#00f5ff' : 'rgba(255,255,255,0.35)',
                    }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!sharedList && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 240,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6, padding: '8px 14px',
              }}>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, flexShrink: 0 }}>RUNNER TAG</span>
                <input
                  value={runnerTag}
                  onChange={e => setRunnerTag(e.target.value)}
                  placeholder="YOUR GAMERTAG"
                  maxLength={32}
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    fontFamily: 'Orbitron, monospace', fontSize: 11, color: '#fff',
                    letterSpacing: 1,
                  }}
                />
              </div>
              <button onClick={resetBuilder} style={{
                fontFamily: 'Share Tech Mono, monospace', fontSize: 9, letterSpacing: 1,
                padding: '10px 16px', borderRadius: 6, cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.35)',
              }}>RESET</button>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>
                {placedCount} / {totalItems} PLACED
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
            {TIERS.map(tier => {
              const style = TIER_STYLES[tier];
              const items = tierItems[tier] || [];
              return (
                <div key={tier}
                  onDragOver={onDragOver}
                  onDrop={e => onDrop(e, tier)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 0,
                    background: style.bg, border: `1px solid ${style.border}`,
                    borderLeft: `3px solid ${style.color}`,
                    borderRadius: 8, minHeight: 64,
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{
                    width: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    alignSelf: 'stretch', borderRight: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <span style={{
                      fontFamily: 'Orbitron, monospace', fontSize: 26, fontWeight: 900,
                      color: style.color,
                      textShadow: tier === 'S' ? '0 0 20px rgba(255,0,0,0.5)' : 'none',
                    }}>{tier}</span>
                  </div>
                  <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 44, alignContent: 'flex-start' }}>
                    {items.length === 0 && (
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.1)', letterSpacing: 1, alignSelf: 'center' }}>
                        {sharedList ? 'EMPTY' : (isMobile ? 'TAP AN ITEM TO ASSIGN' : 'DRAG ITEMS HERE')}
                      </span>
                    )}
                    {items.map(item => (
                      <TierPill key={item.id} item={item} zone={tier}
                        onDragStart={onDragStart} onDragEnd={onDragEnd}
                        onClick={isMobile ? () => onMobileTap(item, tier) : undefined}
                        accentColor={style.color}
                        draggable={!sharedList}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {!sharedList && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 }}>
                  UNRANKED POOL — {unranked.length} ITEMS
                </span>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: 1 }}>
                  {isMobile ? 'TAP TO ASSIGN' : 'DRAG INTO TIERS'}
                </span>
              </div>
              <div
                onDragOver={onDragOver}
                onDrop={e => onDrop(e, 'unranked')}
                style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8, padding: 12,
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8,
                  minHeight: 80,
                }}
              >
                {unranked.length === 0 ? (
                  <div style={{
                    gridColumn: '1 / -1', textAlign: 'center',
                    fontFamily: 'Share Tech Mono, monospace', fontSize: 10,
                    color: 'rgba(0,255,136,0.4)', letterSpacing: 2, padding: '20px 0',
                  }}>
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

          <div style={{
            background: 'rgba(255,136,0,0.04)', border: '1px solid rgba(255,136,0,0.12)',
            borderRadius: 10, padding: '24px 28px',
          }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,136,0,0.6)', letterSpacing: 2, marginBottom: 16 }}>
              ⬢ GENERATE + SHARE YOUR TIER LIST
            </div>

            {!generatedImage ? (
              <button
                onClick={handleGenerate}
                disabled={isGenerating || placedCount === 0}
                style={{
                  fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, letterSpacing: 2,
                  padding: '14px 32px', borderRadius: 8, cursor: placedCount === 0 ? 'not-allowed' : 'pointer',
                  background: isGenerating ? 'rgba(255,136,0,0.06)' : 'rgba(255,136,0,0.12)',
                  border: '1px solid rgba(255,136,0,0.3)', color: '#ff8800',
                  opacity: placedCount === 0 ? 0.4 : 1,
                  width: '100%', transition: 'all 0.2s',
                }}
              >
                {isGenerating ? 'GENERATING...' : placedCount === 0 ? 'ADD ITEMS TO TIERS FIRST' : 'GENERATE TIER LIST IMAGE'}
              </button>
            ) : (
              <div>
                <img src={generatedImage} alt="Your Marathon Tier List" style={{ width: '100%', borderRadius: 6, marginBottom: 16, border: '1px solid rgba(255,255,255,0.06)' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'POST TO X',       action: handleShareX,    color: '#fff' },
                    { label: 'POST TO REDDIT',  action: handleShareReddit, color: '#ff4500' },
                    { label: copied ? 'COPIED!' : 'COPY LINK', action: handleCopyLink, color: '#00f5ff' },
                    { label: 'DOWNLOAD',        action: handleDownload,   color: '#00ff88' },
                  ].map(btn => (
                    <button key={btn.label} onClick={btn.action} style={{
                      fontFamily: 'Share Tech Mono, monospace', fontSize: 9, letterSpacing: 1,
                      padding: '10px 0', borderRadius: 6, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.04)', border: `1px solid ${btn.color}22`,
                      color: btn.color, transition: 'background 0.15s',
                    }}>
                      {btn.label}
                    </button>
                  ))}
                </div>
                {shareUrl && (
                  <div style={{
                    fontFamily: 'Share Tech Mono, monospace', fontSize: 8,
                    color: 'rgba(255,255,255,0.2)', letterSpacing: 1, wordBreak: 'break-all',
                    background: 'rgba(255,255,255,0.02)', borderRadius: 4, padding: '8px 12px',
                    marginBottom: 8,
                  }}>
                    {shareUrl.length > 80 ? shareUrl.slice(0, 80) + '…' : shareUrl}
                  </div>
                )}
                <button onClick={() => { setGeneratedImage(null); setShareUrl(''); }} style={{
                  fontFamily: 'Share Tech Mono, monospace', fontSize: 9, letterSpacing: 1,
                  padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.3)',
                }}>
                  ← EDIT TIER LIST
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      <Link href="/" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.18)', textDecoration: 'none' }}>
        ← BACK TO THE GRID
      </Link>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
        @media (max-width: 768px) {
          .stats-strip { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}

function TierPill({ item, zone, onDragStart, onDragEnd, onClick, accentColor, draggable = true }) {
  const icon = item.kind === 'shell' ? (SHELL_SYMBOLS[item.name] || '⬠') : getWeaponIcon(item.raw?.weapon_type);
  const imgSrc = getImageSrc(item);
  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? e => onDragStart(e, item.id, zone) : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      onClick={onClick}
      title={item.subtext}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 5,
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
        cursor: draggable ? 'grab' : 'default',
        userSelect: 'none', transition: 'background 0.15s',
      }}
    >
      {imgSrc ? (
        <img src={imgSrc} alt={item.name}
          style={{ width: 24, height: 16, objectFit: 'contain', opacity: 0.8, flexShrink: 0 }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      ) : (
        <span style={{ fontSize: 12, opacity: 0.5, lineHeight: 1 }}>{icon}</span>
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
      draggable
      onDragStart={e => onDragStart(e, item.id, 'unranked')}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 7, padding: '10px 12px', cursor: 'grab',
        userSelect: 'none', transition: 'background 0.15s',
      }}
    >
      {imgSrc ? (
        <img src={imgSrc} alt={item.name}
          style={{ width: '100%', height: 44, objectFit: 'contain', marginBottom: 6, opacity: 0.85 }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      ) : (
        <div style={{ fontSize: 18, opacity: 0.4, marginBottom: 6, lineHeight: 1 }}>{icon}</div>
      )}
      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5, marginBottom: 4 }}>
        {item.name}
      </div>
      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>
        {item.subtext}
      </div>
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: 1 }}>{label}</span>
      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

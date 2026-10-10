'use client';
// components/game/BountyNetClient.js
// The BOUNTY NET lifecycle simulator: the only client code in the graphic. Game-agnostic: every claim it
// shows arrives in `sim.claims` (built by a game adapter from that game's single source of truth) and is
// rendered verbatim with its Confirmed or UNPUBLISHED tag and source. This file holds UI labels only.
// State lives in lib/game/bountySim.js (pure reducer, also used by the tests and the optional URL hash).
//
// Motion: transform and opacity only. The ladder uses FLIP via the Web Animations API; everything else is
// CSS keyframes keyed by the action sequence. Under prefers-reduced-motion nothing animates (state changes
// are instant, the static glow stays). Every panel is server-rendered at its final size, so nothing shifts.

import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { reduce, INITIAL, ACTIONS, canRun, heatOf, ladderOrder, encodeHash, decodeHash } from '@/lib/game/bountySim';

var useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

var DECK = [
  { key: 'eliminate', label: 'Eliminate an Operator' },
  { key: 'chain', label: 'Chain a kill' },
  { key: 'wipe', label: 'Wipe a squad' },
  { key: 'wanted', label: 'Kill while Wanted' },
];
var CLEARS = [
  { key: 'lose', label: 'Lose your Dog Tag' },
  { key: 'die', label: 'Die without Exfilling' },
  { key: 'pay', label: 'Pay off at the Bounty Station' },
];
var LABELS = { eliminate: 'Eliminate an Operator', chain: 'Chain a kill', wipe: 'Wipe a squad', wanted: 'Kill while Wanted', intel: 'Buy Intel', claim: 'Kill and Exfil with the Dog Tag', lose: 'Lose your Dog Tag', die: 'Die without Exfilling', pay: 'Pay off at the Bounty Station', extract: 'Extract with a bounty' };
var BARS = [0.78, 0.62, 0.7, 0.55, 0.82, 0.6, 0.74, 0.5, 0.66, 0.58, 0.8, 0.64]; // redaction bar widths

function sim(state, action) {
  if (action.type === 'load') return action.state;
  return reduce(state, action);
}

export function Claim({ c, lastChecked }) {
  if (!c) return null;
  var ok = c.status === 'confirmed';
  return (
    <li className={'bn-node' + (ok ? '' : ' unp')} data-claim-id={c.id} data-status={c.status}>
      <span className={'bn-tag' + (ok ? '' : ' unp')}>{ok ? 'Confirmed' : 'UNPUBLISHED'}</span>
      {c.text}
      <span className="bn-src" data-bn-allow-digits="">
        {ok ? 'Source: ' : 'Not published yet. Last checked ' + lastChecked + '.'}
        {ok ? (c.source.href ? <a href={c.source.href} rel="noopener" target="_blank">{c.source.label}</a> : c.source.label) : null}
      </span>
    </li>
  );
}

// An unpublished item as an encrypted block that opens to its text (a confirmed item renders as a Claim).
function Unpub({ c, lastChecked, label, onOpen }) {
  if (!c) return null;
  if (c.status === 'confirmed') return <ul className="bn-list"><Claim c={c} lastChecked={lastChecked} /></ul>;
  return (
    <details className="bn-unp" data-claim-id={c.id} data-status={c.status} onToggle={onOpen ? function (e) { if (e.currentTarget.open) onOpen(); } : undefined}>
      <summary>
        <span className="bn-glitch">UNPUBLISHED</span>
        <span className="bn-topic">{label || c.topic}</span>
        <span className="bn-bars" aria-hidden="true"><i style={{ width: '38%' }} /><i style={{ width: '22%' }} /><i style={{ width: '30%' }} /></span>
      </summary>
      <p className="bn-reveal">{c.text}<span className="bn-src" data-bn-allow-digits="">{'Not published yet. Last checked ' + lastChecked + '.'}</span></p>
    </details>
  );
}

// Confirmed claims as a list, unpublished ones as a row of compact blocks (`extra` joins that row).
function Claims({ ids, sim: s, lastChecked, cols, extra }) {
  var conf = ids.filter(function (id) { return s.claims[id] && s.claims[id].status === 'confirmed'; });
  var unp = ids.filter(function (id) { return s.claims[id] && s.claims[id].status !== 'confirmed'; });
  return (
    <>
      {conf.length ? <ul className={'bn-list' + (cols ? ' cols' : '')}>{conf.map(function (id) { return <Claim key={id} c={s.claims[id]} lastChecked={lastChecked} />; })}</ul> : null}
      {unp.length || extra ? <div className="bn-unprow">{extra}{unp.map(function (id) { return <Unpub key={id} c={s.claims[id]} lastChecked={lastChecked} />; })}</div> : null}
    </>
  );
}

// Original dog tag glyph: a chamfered plate in four pieces (so it can shatter), a hole, a seal and
// redaction bars. `end` picks the exit animation; `heat` drives the glow layer's opacity.
var PIECES = ['20,10 64,10 52,88 0,100 0,30', '64,10 100,10 120,30 120,82 52,88', '52,88 120,82 120,160 100,180 70,180', '0,100 52,88 70,180 20,180 0,160'];
function DogTag({ live, end, heat, seq }) {
  return (
    <div className="bn-tagstage" aria-hidden="true">
      <svg className="bn-tagghost" viewBox="-6 -6 132 192"><polygon points="20,10 100,10 120,30 120,160 100,180 20,180 0,160 0,30" /></svg>
      {live || end ? (
        <div key={seq} className={'bn-tagwrap' + (live ? ' flip' : ' end-' + end)}>
          <span className="bn-tglow" style={{ opacity: live ? 0.25 + heat * 0.75 : 0 }} />
          <svg className="bn-tagsvg" viewBox="-6 -6 132 192">
            <defs>
              <linearGradient id="bn-steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2c3b47" /><stop offset="0.55" stopColor="#16202a" /><stop offset="1" stopColor="#25333e" /></linearGradient>
              <clipPath id="bn-tagclip"><polygon points="20,10 100,10 120,30 120,160 100,180 20,180 0,160 0,30" /></clipPath>
            </defs>
            {PIECES.map(function (p, i) { return <polygon key={i} className={'bn-piece p' + i} points={p} />; })}
            <g className="bn-tagart">
              <circle cx="60" cy="30" r="7" className="bn-hole" />
              <circle cx="60" cy="104" r="26" className="bn-seal" />
              <path d="M60 70 V138 M26 104 H94" className="bn-cross" />
              <circle cx="60" cy="104" r="9" className="bn-core" />
              <rect x="22" y="146" width="76" height="7" rx="2" className="bn-emb" />
              <rect x="22" y="159" width="48" height="7" rx="2" className="bn-emb" />
            </g>
            <g clipPath="url(#bn-tagclip)"><rect className="bn-shimmer" x="-60" y="-10" width="40" height="210" /></g>
          </svg>
        </div>
      ) : null}
    </div>
  );
}

function Card({ row, pos, refFn, bounty, kind, flashSeq }) {
  var h = row.heat;
  var cls = 'bn-card' + (row.you ? ' you' : '') + (kind === 'rival' ? ' rival' : '') + (pos < 5 ? ' hero' : '');
  return (
    <li ref={refFn} className={cls} data-card={row.id}>
      <span className="bn-cglow" style={{ opacity: 0.15 + h * 0.85 }} />
      <span className="bn-rank" data-bn-rank="">{pos + 1}</span>
      <span className="bn-cbody">
        {row.you ? <span className="bn-you">You{bounty ? <i className="bn-mini" /> : null}</span> : kind === 'rival' ? <span className="bn-you rv">Hunting you{flashSeq ? <i key={flashSeq} className="bn-flash" /> : null}</span> : <span className="bn-redact" style={{ width: (BARS[pos % BARS.length] * 100) + '%' }} />}
        <span className="bn-redact short" />
        <span className="bn-hm"><i style={{ transform: 'scaleX(' + h.toFixed(3) + ')' }} /></span>
      </span>
    </li>
  );
}

export default function BountyNetClient({ sim: s }) {
  var [state, dispatch] = useReducer(sim, INITIAL);
  var [open, setOpen] = useState(false);
  var reduced = useRef(false);
  var ladderRef = useRef(null);
  var cardEls = useRef({});
  var rects = useRef({});
  var hashReady = useRef(false);
  var lc = s.lastChecked;

  // Reduced motion, the optional shared state in the hash, and pointer parallax (fine pointers only).
  useEffect(function () {
    var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    reduced.current = !!(mq && mq.matches);
    var fromHash = decodeHash(window.location.hash);
    if (fromHash) dispatch({ type: 'load', state: fromHash });
    hashReady.current = true;
    var el = ladderRef.current;
    var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    if (!el || reduced.current || !fine) return undefined;
    var raf = 0, px = 0, py = 0;
    function paint() { raf = 0; el.style.setProperty('--px', px.toFixed(3)); el.style.setProperty('--py', py.toFixed(3)); }
    function onMove(e) { var r = el.getBoundingClientRect(); px = (e.clientX - r.left) / r.width - 0.5; py = (e.clientY - r.top) / r.height - 0.5; if (!raf) raf = requestAnimationFrame(paint); }
    function onLeave() { px = 0; py = 0; if (!raf) raf = requestAnimationFrame(paint); }
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return function () { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave); if (raf) cancelAnimationFrame(raf); };
  }, []);

  // Keep the hash in step with the state (replaceState: no history entries, nothing stored).
  useEffect(function () {
    if (!hashReady.current) return;
    var base = window.location.pathname + window.location.search;
    var url = state.seq === 0 && state.steps === 0 ? base : base + '#' + encodeHash(state);
    if (url !== base + window.location.hash) window.history.replaceState(window.history.state, '', url);
  }, [state]);

  var killers = ladderOrder(s.ladders.killers[state.scope], state);
  var orderKey = killers.map(function (r) { return r.id; }).join(',');
  var youPos = killers.findIndex(function (r) { return r.you; });

  // FLIP: measure every card relative to the ladder, then play the move from the old spot to the new one.
  useIsoLayoutEffect(function () {
    var root = ladderRef.current;
    if (!root) return;
    var base = root.getBoundingClientRect();
    Object.keys(cardEls.current).forEach(function (id) {
      var el = cardEls.current[id];
      if (!el) return;
      var r = el.getBoundingClientRect();
      var now = { x: r.left - base.left, y: r.top - base.top, w: r.width };
      var was = rects.current[id];
      rects.current[id] = now;
      if (!was || !was.w || !now.w || reduced.current || !el.animate) return;
      var dx = was.x - now.x, dy = was.y - now.y, sx = was.w / now.w;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ')', opacity: 0.85 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  }, [orderKey, open]);

  function run(key) { dispatch({ type: key }); }
  function setTab(v) { if (v !== state.tab) dispatch({ type: 'tab', value: v }); }
  function onTabKey(e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var next = state.tab === 'killers' ? 'hunters' : 'killers';
    setTab(next);
    var b = document.getElementById('bn-tab-' + next);
    if (b) b.focus();
  }

  var heat = heatOf(state);
  var t = s.terms;
  var endAction = state.ended ? { claimed: 'claim', lost: 'lose', died: 'die', paid: 'pay' }[state.ended] : null;
  var showEnd = !state.bounty && endAction && state.last === endAction ? state.ended : null;
  var status = state.last === null ? 'Ready. Pick an action in the control deck.'
    : ACTIONS[state.last] && ACTIONS[state.last].heat ? LABELS[state.last] + ': heat raised. Your card is at illustrative position ' + (youPos + 1) + '.'
    : state.last === 'tab' ? 'Showing the ' + (state.tab === 'killers' ? t.killers.text : t.hunters.text) + ' board.'
    : state.last === 'scope' ? 'Showing the ' + (state.scope === 'global' ? 'Global' : 'Friends') + ' scope (illustrative).'
    : LABELS[state.last] + (state.last === 'extract' ? ': UNPUBLISHED.' : '.');
  var hunters = s.ladders.hunters[state.scope].map(function (h, i) { return { id: 'h' + i, heat: h, you: false }; });

  return (
    <div className="bn-sim">
      <div className="bn-shead">
        <div className="bn-tabs" role="tablist" aria-label="Illustrative board" onKeyDown={onTabKey}>
          {[['killers', t.killers, 'Killers'], ['hunters', t.hunters, null]].map(function (x) {
            var on = state.tab === x[0];
            return (
              <button key={x[0]} id={'bn-tab-' + x[0]} type="button" role="tab" className="bn-tab" aria-selected={on ? 'true' : 'false'} aria-controls={'bn-panel-' + x[0]} tabIndex={on ? 0 : -1} onClick={function () { setTab(x[0]); }}>
                <span data-term-of={x[1].claimId || undefined}>{x[1].text}</span>{x[2] && x[1].text !== x[2] ? <small>{x[2]}</small> : null}
              </button>
            );
          })}
        </div>
        <div className="bn-scope" role="group" aria-label="Board scope (illustrative)">
          {['global', 'friends'].map(function (v) {
            return <button key={v} type="button" className="bn-pill" aria-pressed={state.scope === v ? 'true' : 'false'} onClick={function () { if (state.scope !== v) dispatch({ type: 'scope', value: v }); }}>{v === 'global' ? 'Global' : 'Friends'}</button>;
          })}
        </div>
        <div className="bn-week">
          <svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" className="bn-wk0" /><circle cx="20" cy="20" r="16" className="bn-wk1" /></svg>
          <span>{t.weekly.text ? <><span data-term-of={t.weekly.claimId}>{t.weekly.text}</span> refresh, illustrative timer</> : 'refresh, illustrative timer'}</span>
        </div>
      </div>

      <div className="bn-ladder" ref={ladderRef}>
        <span className="bn-scan" aria-hidden="true" />
        <div id="bn-panel-killers" role="tabpanel" aria-labelledby="bn-tab-killers" hidden={state.tab !== 'killers'}>
          <ol className="bn-hero" aria-label="Illustrative ladder, top five">
            {killers.slice(0, 5).map(function (r, i) { return <Card key={r.id} row={r} pos={i} bounty={state.bounty} refFn={function (el) { cardEls.current[r.id] = el; }} />; })}
          </ol>
          <ol className={'bn-rest' + (open ? ' open' : '')} aria-label="Illustrative ladder, the rest of the board">
            {killers.slice(5).map(function (r, i) { return <Card key={r.id} row={r} pos={i + 5} bounty={state.bounty} refFn={function (el) { cardEls.current[r.id] = el; }} />; })}
          </ol>
        </div>
        <div id="bn-panel-hunters" role="tabpanel" aria-labelledby="bn-tab-hunters" hidden={state.tab !== 'hunters'}>
          <ol className="bn-hero" aria-label="Illustrative hunters ladder, top five">
            {hunters.slice(0, 5).map(function (r, i) { return <Card key={r.id} row={r} pos={i} kind={i === s.rivalHunter ? 'rival' : null} flashSeq={i === s.rivalHunter && state.ended === 'claimed' ? state.seq : 0} />; })}
          </ol>
          <ol className={'bn-rest' + (open ? ' open' : '')} aria-label="Illustrative hunters ladder, the rest of the board">
            {hunters.slice(5).map(function (r, i) { return <Card key={r.id} row={r} pos={i + 5} />; })}
          </ol>
        </div>
        <button type="button" className="bn-more" aria-expanded={open ? 'true' : 'false'} onClick={function () { setOpen(!open); }}>{open ? 'Hide the rest of the board' : 'Show the rest of the board'}</button>
        <p className="bn-cap bn-live">{t.weekly.text ? <>On the real board these are <span data-term-of={t.weekly.claimId}>{t.weekly.text}</span> lists. The live movement here is illustrative.</> : 'The live movement here is illustrative.'}</p>
        <div className="bn-why"><Claims ids={s.panels.header} sim={s} lastChecked={lc} cols /></div>
        <p className="bn-cap">Kills raise the bounty and notoriety; how the two relate is not stated. Ladder positions here are illustrative. The glow is continuous because the number of notoriety levels is UNPUBLISHED.</p>
      </div>

      <p className="bn-status" role="status" aria-live="polite" data-bn-rank="">{status}</p>

      <div className="bn-grid">
        <section className="bn-box bn-deck" aria-labelledby="bn-deck-h">
          <h3 id="bn-deck-h">Control deck</h3>
          <div className="bn-btns">
            {DECK.map(function (b) {
              return <button key={b.key} type="button" className="bn-btn hot" disabled={!canRun(state, b.key)} onClick={function () { run(b.key); }}>{b.label}</button>;
            })}
          </div>
          <p className="bn-cap">Kills raise it. The amounts are UNPUBLISHED, so every action here moves you by the same step. Chain a kill and Kill while Wanted need an active bounty.</p>
          <Claims ids={s.panels.deck} sim={s} lastChecked={lc} />
          <button type="button" className="bn-btn ghost" onClick={function () { run('reset'); }}>Reset simulator</button>
        </section>

        <section className="bn-box bn-tagbox" aria-labelledby="bn-tag-h">
          <h3 id="bn-tag-h">Your Dog Tag</h3>
          <DogTag live={state.bounty} end={showEnd} heat={heat} seq={state.seq} />
          <p className="bn-tagstate">{state.bounty ? 'Bounty on your Dog Tag' : state.ended === 'claimed' ? 'Dog Tag taken by a hunter' : state.ended ? 'Bounty cleared' : 'No bounty yet'}</p>
          <Claims ids={s.panels.tag} sim={s} lastChecked={lc} />
        </section>

        <section className="bn-box bn-log" aria-labelledby="bn-log-h">
          <h3 id="bn-log-h">Intel log</h3>
          <ul className="bn-list bn-logl" tabIndex={0} aria-label="Facts demonstrated so far, newest first">
            {state.log.length ? state.log.map(function (id) { return <Claim key={id} c={s.claims[id]} lastChecked={lc} />; }) : <li className="bn-empty">Run an action: each fact it demonstrates is logged here with its tag and source.</li>}
          </ul>
        </section>

        <section className="bn-box bn-hunter" aria-labelledby="bn-hunt-h">
          <h3 id="bn-hunt-h">Hunter</h3>
          <div className="bn-radar" aria-hidden="true">
            <svg viewBox="0 0 200 200">
              <defs><radialGradient id="bn-rg"><stop offset="0" stopColor="rgba(108,201,126,0.18)" /><stop offset="1" stopColor="rgba(108,201,126,0)" /></radialGradient></defs>
              <rect width="200" height="200" className="bn-rbg" />
              {[25, 50, 75, 100, 125, 150, 175].map(function (v) { return <g key={v}><line x1={v} y1="0" x2={v} y2="200" className="bn-rgrid" /><line x1="0" y1={v} x2="200" y2={v} className="bn-rgrid" /></g>; })}
              <circle cx="100" cy="100" r="92" className="bn-rring" /><circle cx="100" cy="100" r="60" className="bn-rring" /><circle cx="100" cy="100" r="28" className="bn-rring" />
              <g className={'bn-vic' + (state.intel ? ' on' : '')} style={{ '--k': (0.3 + 0.7 * heat).toFixed(3) }}>
                <circle cx="134" cy="72" r="54" fill="url(#bn-rg)" className="bn-vicc" />
              </g>
              {state.intel ? <circle key={state.seq} cx="134" cy="72" r="5" className="bn-blip" /> : null}
              <g className="bn-sweep"><path d="M100 100 L100 6 A94 94 0 0 1 166 33 Z" /></g>
            </svg>
            {!state.bounty ? <span className="bn-rmsg">No Wanted target</span> : null}
          </div>
          <div className="bn-btns two">
            <button type="button" className="bn-btn" disabled={!canRun(state, 'intel')} onClick={function () { run('intel'); }}>Buy Intel</button>
            <button type="button" className="bn-btn hot" disabled={!canRun(state, 'claim')} onClick={function () { run('claim'); }}>Kill and Exfil with the Dog Tag</button>
          </div>
          <p className="bn-cap">The revealed area scales with the heat meter (visual only).</p>
          <div className="bn-claimres" aria-hidden={state.ended === 'claimed' ? undefined : 'true'}>
            {state.ended === 'claimed' ? (
              <span key={state.seq} className="bn-got"><i className="bn-gotag" /><span className="bn-cash">DMZ Cash <b aria-label="amount not published" /></span></span>
            ) : <span className="bn-cash off">DMZ Cash <b /></span>}
          </div>
          <Claims ids={s.panels.hunter} sim={s} lastChecked={lc} />
        </section>

        <section className="bn-box bn-clear" aria-labelledby="bn-clear-h">
          <h3 id="bn-clear-h">Clear a bounty</h3>
          <div className="bn-btns">
            {CLEARS.map(function (b) { return <button key={b.key} type="button" className={'bn-btn' + (state.ended === { lose: 'lost', die: 'died', pay: 'paid' }[b.key] ? ' done' : '')} disabled={!canRun(state, b.key)} onClick={function () { run(b.key); }}>{b.label}</button>; })}
          </div>
          <Claims ids={s.panels.clear.filter(function (id) { return id !== 'extract-clears'; })} sim={s} lastChecked={lc}
            extra={<Unpub c={s.claims['extract-clears']} lastChecked={lc} label="Extract with a bounty" onOpen={function () { run('extract'); }} />} />
        </section>
      </div>
    </div>
  );
}

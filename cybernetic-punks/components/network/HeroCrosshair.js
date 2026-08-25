'use client';
// components/network/HeroCrosshair.js
// The root hero signature: aim -> lock -> fire -> persistent bullet-marks crosshair,
// ported from the approved v7 mock. Client component so the loop can run in useEffect
// and honor prefers-reduced-motion. Captions are FLAVOR ONLY ("// ACQUIRING...",
// "// TARGET LOCKED", "// ON TARGET"); the load-bearing brand word "verified" is
// deliberately NOT used here (reserved for real claims). Reduced-motion settles static
// on "// LOCKED". Colors come from the .cnp-root design tokens via getComputedStyle.
import { useEffect, useRef } from 'react';

export default function HeroCrosshair() {
  const reticleRef = useRef(null);
  const bracketsRef = useRef(null);
  const flashRef = useRef(null);
  const marksRef = useRef(null);
  const labelRef = useRef(null);
  const glowRef = useRef(null);

  useEffect(function () {
    var reticle = reticleRef.current;
    var brackets = bracketsRef.current;
    var flash = flashRef.current;
    var marks = marksRef.current;
    var label = labelRef.current;
    var glowdisc = glowRef.current;
    if (!reticle || !label) return;

    var spots = [[-38, -30], [42, -18], [18, 40], [-46, 28], [30, 44], [-20, -46], [50, 10], [-52, -8]];
    var mi = 0;
    var marksArr = [];
    var alive = true;
    var timers = [];
    function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || getComputedStyle(reticle).getPropertyValue(n).trim(); }
    function tokenColor(n, fallback) {
      var el = reticle.closest('.cnp-root') || document.documentElement;
      var v = getComputedStyle(el).getPropertyValue(n).trim();
      return v || fallback;
    }
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function wait(ms) { return new Promise(function (r) { var t = setTimeout(r, ms); timers.push(t); }); }
    function moveTo(x, y) {
      return new Promise(function (res) {
        reticle.style.transition = 'transform .55s cubic-bezier(.5,.05,.2,1)';
        reticle.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        if (glowdisc) { glowdisc.style.transition = 'transform .55s ease'; glowdisc.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
        var t = setTimeout(res, 560); timers.push(t);
      });
    }

    async function cycle() {
      if (!alive) return;
      var pair = spots[mi % spots.length];
      var x = pair[0], y = pair[1];
      var dim = tokenColor('--text-dim', '#9c908c');
      var gold = tokenColor('--gold', '#E8B54D');
      var red = tokenColor('--red', '#ff2038');
      // acquire
      label.textContent = '// ACQUIRING...'; label.style.color = dim;
      if (brackets) { brackets.style.transition = 'opacity .2s'; brackets.style.opacity = '0'; }
      await moveTo(x + (Math.random() * 8 - 4), y + (Math.random() * 8 - 4));
      if (!alive) return;
      await moveTo(x, y);
      if (!alive) return;
      // lock
      label.textContent = '// TARGET LOCKED'; label.style.color = gold;
      if (brackets) { brackets.style.transition = 'opacity .25s'; brackets.style.opacity = '1'; }
      await wait(420);
      if (!alive) return;
      // fire
      label.textContent = '// ON TARGET'; label.style.color = red;
      if (flash) {
        flash.setAttribute('cx', x); flash.setAttribute('cy', y);
        flash.style.transition = 'none'; flash.style.opacity = '1'; flash.setAttribute('r', '6');
      }
      reticle.style.transition = 'transform .08s ease-out';
      reticle.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(1.12)';
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        if (flash) { flash.style.transition = 'opacity .35s ease, r .35s ease'; flash.style.opacity = '0'; flash.setAttribute('r', '22'); }
        reticle.style.transition = 'transform .3s ease'; reticle.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(1)';
      }); });
      // persistent bullet mark
      if (marks) {
        var m = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        m.setAttribute('transform', 'translate(' + x + ',' + y + ')'); m.setAttribute('opacity', '0');
        m.innerHTML = '<circle r="3.4" fill="#0a0708" stroke="#6E1423" stroke-width="1.3"/><circle r="6.5" fill="none" stroke="#9A2740" stroke-width=".7" opacity=".5"/>';
        marks.appendChild(m);
        requestAnimationFrame(function () { m.style.transition = 'opacity .4s'; m.setAttribute('opacity', '.9'); });
        marksArr.push(m);
        if (marksArr.length > 6) {
          var old = marksArr.shift();
          old.style.transition = 'opacity .6s'; old.setAttribute('opacity', '0');
          var t = setTimeout(function () { if (old && old.remove) old.remove(); }, 650); timers.push(t);
        }
      }
      await wait(1100);
      if (!alive) return;
      mi++; cycle();
    }

    if (reduce) {
      label.textContent = '// LOCKED';
      label.style.color = tokenColor('--gold', '#E8B54D');
      if (brackets) brackets.style.opacity = '1';
    } else {
      cycle();
    }

    return function () {
      alive = false;
      timers.forEach(function (t) { clearTimeout(t); });
    };
  }, []);

  return (
    <div className="scope">
      <svg id="scopeSvg" viewBox="-110 -110 220 220" aria-hidden="true">
        <defs>
          <radialGradient id="cnpCg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff2038" stopOpacity=".8" />
            <stop offset="55%" stopColor="#ff2038" stopOpacity=".12" />
            <stop offset="100%" stopColor="#ff2038" stopOpacity="0" />
          </radialGradient>
          <filter id="cnpGlow"><feGaussianBlur stdDeviation="2.6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <g ref={marksRef} />
        <g className="ring-rot" stroke="#6E1423" strokeWidth="1" opacity=".5">
          <circle cx="0" cy="0" r="96" fill="none" strokeDasharray="2 10" />
        </g>
        <circle ref={glowRef} className="glowpulse" cx="0" cy="0" r="70" fill="url(#cnpCg)" />
        <g ref={reticleRef} filter="url(#cnpGlow)" stroke="#ff2038" fill="none" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="0" cy="0" r="34" />
          <circle cx="0" cy="0" r="5" fill="#ff2038" stroke="none" />
          <line x1="0" y1="-48" x2="0" y2="-16" />
          <line x1="0" y1="16" x2="0" y2="48" />
          <line x1="-48" y1="0" x2="-16" y2="0" />
          <line x1="16" y1="0" x2="48" y2="0" />
          <g ref={bracketsRef} opacity="0" strokeWidth="2.4">
            <path d="M-44,-30 L-44,-44 L-30,-44" /><path d="M44,-30 L44,-44 L30,-44" />
            <path d="M-44,30 L-44,44 L-30,44" /><path d="M44,30 L44,44 L30,44" />
          </g>
        </g>
        <circle ref={flashRef} className="flash" cx="0" cy="0" r="16" fill="#fff" />
      </svg>
      <div className="scope-label" ref={labelRef} style={{ color: 'var(--text-dim)' }}>{'// ACQUIRING...'}</div>
    </div>
  );
}

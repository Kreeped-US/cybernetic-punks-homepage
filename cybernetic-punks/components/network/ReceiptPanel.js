'use client';
// components/network/ReceiptPanel.js
// The receipts set piece: a terminal-style panel that animates a REAL verification chain
// resolving -- source document -> the check (in-game / official source) -> patch stamp ->
// the claim it backs -> a CLICKABLE link through to the real page (inspectable = traversable).
// The receipt is fetched server-side (app/page.js getReceipt) from a real verified_source row.
//
// FAIL-OPEN (trust set piece: a broken receipt is worse than none): when `receipt` is null
// (empty/malformed/thrown fetch), render a CLEAN STATIC true-and-traversable claim instead --
// never a half-resolved chain, a null claim, or a dead link. Respects prefers-reduced-motion
// (all rows shown at once).
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ReceiptPanel({ receipt }) {
  var rows = receipt ? buildRows(receipt) : [];
  var total = rows.length;
  var [step, setStep] = useState(0);

  useEffect(function () {
    if (!receipt || total === 0) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setStep(total + 1); return; }
    var s = 0;
    var timers = [];
    function tick() { s += 1; setStep(s); if (s <= total) timers.push(setTimeout(tick, 650)); }
    timers.push(setTimeout(tick, 450));
    return function () { timers.forEach(function (t) { clearTimeout(t); }); };
  }, [receipt, total]);

  // FAIL-OPEN static fallback.
  if (!receipt) {
    return (
      <div className="receipt-shell static">
        <div className="receipt-head"><span>{'// VERIFICATION METHOD'}</span></div>
        <div className="receipt-body">
          <p className="receipt-static-claim">Every stat on this network is verified in-game, by hand, before it ships - and traced to its source.</p>
          <Link href="/marathon/weapons" className="receipt-link in">Inspect the verified weapon data &rarr;</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="receipt-shell live">
      <div className="receipt-head"><span>{'// VERIFICATION RECEIPT'}</span><span className="receipt-live"><i aria-hidden="true" />resolving</span></div>
      <div className="receipt-body">
        {rows.map(function (r, i) {
          return (
            <div key={r.lbl} className={'receipt-line' + (step > i ? ' in' : '') + (r.claim ? ' is-claim' : '')}>
              <span className="receipt-lbl">{r.lbl}</span>
              <span className="receipt-val">{r.val}</span>
            </div>
          );
        })}
        <Link href={receipt.href} className={'receipt-link' + (step > total ? ' in' : '')}>{receipt.linkLabel} &rarr;</Link>
      </div>
    </div>
  );
}

function buildRows(r) {
  var rows = [
    { lbl: 'source', val: r.source },
    { lbl: 'check', val: r.check },
  ];
  if (r.patch) rows.push({ lbl: 'patch', val: 'Update ' + r.patch });
  rows.push({ lbl: 'claim', val: r.claim, claim: true });
  return rows;
}

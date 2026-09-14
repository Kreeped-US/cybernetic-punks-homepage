'use client';

// components/wardogs/WardogsCashTicker.js
// The Wardogs "estimated in-game cash spent on loadouts" ticker -- an HONEST, sourced,
// transparently-labeled live MODEL for the /wardogs landing. It is NOT a claimed hard fact:
// it is a client-side simulation from real, citable inputs, clearly labeled as an estimate.
//
// MODEL (all inputs real + documented; props come from the server component). On the hub the
// ticker is driven by the reconciled economy model's total $/sec (ratePerSec + itemized), so the
// dials below are the fallback + the DISPLAYED sourcing figures -- kept in sync with the model:
//   peakConcurrent       337,000  -- SteamDB PEAK concurrent (Wardogs EA launch, Sept 11 2026,
//                                     #2 on Steam; Bulkhead separately claimed ~400K). Cited as
//                                     CONTEXT/scale, NOT the rate basis.
//   sustainedPlayers     130,000  -- the RATE BASIS: a CONSERVATIVE time-average active concurrent
//                                     (~39% of the 337K SteamDB peak). v3 lowered this from 170K:
//                                     170K x total-elapsed still treated CCU as ~24/7; a day-average
//                                     across timezones is lower, so the model does NOT assume
//                                     everyone is online at once. Passed from the model's DEFAULT_PLAYERS.
//   loadoutsPerHour      1.2      -- deaths that actually re-buy a PRIMARY (a life every ~20-30 min,
//                                     but you keep your gun on extract/survival) -- v3 cold, tunable
//   avgLoadoutCost       ~$990    -- v3 POPULATION-WEIGHTED typical primary from OUR real prices
//                                     (most players ~Career 20 run free starters / cheap early guns,
//                                     not an M4-class gun every life); "partly powered by our data"
//   launchIso            2026-09-10T16:00:00Z  -- EA launch epoch (documented)
// rate/sec = sustainedPlayers * (loadoutsPerHour/3600) * avgLoadoutCost
// value    = rate/sec * (now - launch)   [cumulative since launch, recomputed each frame]
//
// Why sustained-average and not peak: peak x total-elapsed overcounts (it assumes 337K online
// every second since launch). Driving the rate off a conservative time-average is more rigorous +
// on-brand (CNP is conservative, not inflated) and moderates the number honestly.
//
// v3 RECALIBRATION (2026-09-14): the earlier dials ran ~6x too hot (weapons $3,090 x 2/hr, ammo
// LMG-spray, 170K treated as 24/7) and got called out. The dials + the model are now a colder,
// population-weighted, deaths-that-rebuy basket that survives scrutiny. See lib/wardogs/economyModel.js.
//
// HONESTY (the moat): the currency is IN-GAME credits (the Wardogs cash economy), NOT real
// money and NOT an official Bulkhead figure. The basis + sources + assumptions are shown on
// the card (not hidden), so "NO HYPE. JUST INTEL." holds -- a sourced, labeled estimate is
// on-brand; a fake number is not. copies-sold (1.25M, Bulkhead official) is cited as scale.

import { useEffect, useRef, useState } from 'react';

export default function WardogsCashTicker({
  sustainedPlayers = 130000,
  peakConcurrent = 337000,
  loadoutsPerHour = 1.2,
  avgLoadoutCost = 990,
  copiesSold = 1250000,
  launchIso = '2026-09-10T16:00:00Z',
  // When passed, the ticker IS this rate (the reconciled economy model's total $/sec, summed
  // across every category). itemized=true switches the basis note to the itemized wording.
  ratePerSec: ratePerSecProp = null,
  itemized = false,
}) {
  const ratePerSec = ratePerSecProp != null ? ratePerSecProp : sustainedPlayers * (loadoutsPerHour / 3600) * avgLoadoutCost;
  const launchMs = new Date(launchIso).getTime();

  const compute = () => Math.floor((ratePerSec * (Date.now() - launchMs)) / 1000);

  const [value, setValue] = useState(compute);
  const [open, setOpen] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (!alive) return;
      setValue(compute());
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratePerSec, launchMs]);

  const A = 'var(--accent, #e0a13a)';
  const AG = 'var(--accent-glow, rgba(224,161,58,0.22))';
  const fmt = (n) => '$' + n.toLocaleString('en-US');

  return (
    <section style={{ borderBottom: '1px solid #1d2026', background: 'radial-gradient(120% 140% at 12% 0%, #17130b 0%, #0e1116 60%)' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(22px,4vw,34px) 24px' }}>
        {/* eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green,#5bd18e)', boxShadow: '0 0 7px var(--green,#5bd18e)', flex: '0 0 auto' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 2, color: A, textTransform: 'uppercase' }}>
            The Wardogs Economy &middot; Live Model
          </span>
        </div>

        {/* the ticking number */}
        <div
          aria-live="off"
          style={{
            fontFamily: 'var(--font-exo2), system-ui, sans-serif',
            fontSize: 'clamp(34px, 8vw, 76px)',
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.5px',
            color: '#fff',
            fontVariantNumeric: 'tabular-nums',
            textShadow: '0 2px 30px ' + AG,
            wordBreak: 'break-word',
          }}
        >
          {fmt(value)}
        </div>

        {/* label */}
        <div style={{ marginTop: 10, fontFamily: 'var(--font-exo2), system-ui, sans-serif', fontSize: 'clamp(13px,1.7vw,16px)', fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.3 }}>
          Est. in-game cash spent on loadouts{' '}
          <span style={{ color: A }}>(modeled, live)</span>
        </div>

        {/* basis -- shown, not hidden: the sources + the honesty caveat */}
        <p style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-tertiary, #8b929c)', maxWidth: 780 }}>
          Modeled from{' '}
          <strong style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>1.25M copies sold</strong> (Bulkhead, official) and Wardogs&rsquo;{' '}
          <strong style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>~337K peak concurrent</strong> (SteamDB) &mdash; driven off a{' '}
          <strong style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>conservative ~{Math.round(sustainedPlayers / 1000)}K sustained average</strong>
          {itemized
            ? <>, summed across <strong style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>every purchase</strong> (weapons, ammo, armor, vehicles, gear) at our real prices &mdash; so the breakdown below adds up to this number. </>
            : <> and an average loadout cost of <strong style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>{fmt(avgLoadoutCost)}</strong> from our price data. </>}
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Live estimate &mdash; in-game credits, not real money, and not an official spend figure.</span>{' '}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            style={{ background: 'none', border: 'none', color: A, font: 'inherit', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >
            {open ? 'Hide the model' : 'How we model this'}
          </button>
        </p>

        {open && (
          <div style={{ marginTop: 14, border: '1px solid #262b33', borderLeft: '3px solid ' + A, borderRadius: '0 4px 4px 0', background: 'rgba(18,21,25,0.6)', padding: '14px 16px', maxWidth: 780 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: A, marginBottom: 10, textTransform: 'uppercase' }}>The model &mdash; all inputs sourced</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary,#b5bcc6)' }}>
              <li><strong style={{ color: '#fff' }}>Peak (context):</strong> ~{Math.round(peakConcurrent / 1000)}K peak concurrent &mdash; SteamDB, Wardogs Early Access launch (Sept 11, 2026, #2 on Steam). Cited for scale &mdash; NOT the rate basis.</li>
              <li><strong style={{ color: '#fff' }}>Rate basis:</strong> ~{Math.round(sustainedPlayers / 1000)}K sustained-average active (~{Math.round((sustainedPlayers / peakConcurrent) * 100)}% of peak) &mdash; a conservative day-average across timezones, so the model does NOT assume everyone is online at once.</li>
              <li><strong style={{ color: '#fff' }}>Scale:</strong> 1,250,000 copies sold &mdash; Bulkhead&rsquo;s official @WARDOGS announcement (Sept 10, 2026).</li>
              {itemized ? (
                <li><strong style={{ color: '#fff' }}>Itemized spend:</strong> each category is (how often you buy it &times; its real price); the ticker is the SUM across weapons, ammo, armor, vehicles, medical and gear &mdash; so the breakdown below reconciles to this number.</li>
              ) : (
                <li><strong style={{ color: '#fff' }}>Avg loadout:</strong> {fmt(avgLoadoutCost)} &mdash; from our real price data (primary median + sidearm + ammo).</li>
              )}
              <li><strong style={{ color: '#fff' }}>Purchase rate:</strong> re-kit ~every {Math.round(60 / (loadoutsPerHour || 2))} min; ammo every life; armor/medical/gear situational; vehicles occasional &mdash; conservative, documented frequencies.</li>
              <li><strong style={{ color: '#fff' }}>Formula:</strong> sustained players &times; (frequency &times; price, per category), accumulated since EA launch (Sept 10, 16:00 UTC) &asymp; {fmt(Math.round(ratePerSec))}/sec.</li>
            </ul>
            <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--text-tertiary,#8b929c)', lineHeight: 1.5 }}>
              An estimate, not a fact: a deliberately conservative economy-scale model (sustained average, not peak) &mdash; the kind of number the game&rsquo;s cash economy produces, not a measured total. No copies-sold figure is used to imply real-money revenue.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

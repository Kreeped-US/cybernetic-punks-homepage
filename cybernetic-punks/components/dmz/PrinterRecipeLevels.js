// components/dmz/PrinterRecipeLevels.js
// Brief 222: the "Recipe unlock levels" block on /dmz/printer, rendered inside the page's reference block right after
// the group named in reference.recipeLevels.afterGroup (lib/games/dmz.js). Server component, no state.
// Tier: ATTRIBUTED, shown with the network "Reported" chip (components/network/confidenceTiers.js: ring icon and
// colour, label only, no caption); the first sentence names the post. Level cards use the same card style as the
// sibling groups; the heading uses the sibling group-title style at 12px. Names are plain text. The Field Upgrade
// line sits outside the recipe list. PRINTER_RECIPE_LEVELS_CSS is added once by the page shell.
import { CONFIDENCE_TIERS, TierIcon } from '@/components/network/confidenceTiers';

var EXO = 'var(--font-exo2), system-ui, sans-serif';
var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// '2026-10-19' -> 'Oct 19, 2026'
function shortDate(iso) {
  var p = iso.split('-');
  return MONTHS[Number(p[1]) - 1] + ' ' + Number(p[2]) + ', ' + p[0];
}

export var PRINTER_RECIPE_LEVELS_CSS = `
.dmzrl-rep{display:inline-flex;align-items:center;gap:6px;margin-right:8px;padding:2px 8px;border:1px solid var(--rep-c);border-radius:999px;font:700 12px/1.3 monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--rep-c);vertical-align:1px}
.dmzrl-src a{padding:14px 0;color:var(--green)}
.dmzrl-src a:focus-visible{outline:2px solid var(--green);outline-offset:2px}
`;

export default function PrinterRecipeLevels({ data }) {
  var tier = CONFIDENCE_TIERS.filter(function (t) { return t.key === data.tier; })[0];
  var src = data.source;
  var when = shortDate(src.date);
  return (
    <div data-recipe-levels="" style={{ margin: '0 0 22px', '--rep-c': tier.color }}>
      <h3 style={{ fontFamily: EXO, fontSize: 12, fontWeight: 800, letterSpacing: 1.8, textTransform: 'uppercase', color: 'var(--green)', margin: '0 0 10px' }}>{data.heading}</h3>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 12px', maxWidth: '64ch' }}>
        <span className="dmzrl-rep"><TierIcon tier={data.tier} size={12} />{tier.label}</span>
        {'These DMZ Player Levels are as listed in ' + src.publisher + "'s " + when + " post '" + src.title + "'; we have not yet re-read the post's full list ourselves."}
      </p>
      <ul data-recipe-list="" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))', gap: 10 }}>
        {data.levels.map(function (r) {
          return (
            <li key={r.level} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px' }}>
              <div style={{ fontFamily: EXO, fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 4 }}>{'Level ' + r.level}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.names.join(', ')}</div>
            </li>
          );
        })}
      </ul>
      {data.also && (
        <p data-recipe-also="" style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '12px 0 0' }}>
          {'Also at Level ' + data.also.level + ': ' + data.also.name + ' (a ' + data.also.kind + ', not a recipe).'}
        </p>
      )}
      <p className="dmzrl-src" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '16px 0 0' }}>
        {'Source: '}
        <a href={src.url} rel="noopener">{src.title}</a>
        {' (' + src.publisher + ' blog, ' + when + ').'}
      </p>
    </div>
  );
}

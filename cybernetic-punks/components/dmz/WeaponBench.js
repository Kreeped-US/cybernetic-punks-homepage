// components/dmz/WeaponBench.js
// The GUNSMITH BENCH on a weapon page (Brief 168): the weapon image with one node per attachment type the launch
// post lists for it, in an ILLUSTRATIVE arrangement (our layout, not the in-game one): the first half of the list
// above the image, the rest below. The APEX toggle (BenchToggle, progressive enhancement) dims the nodes the Apex
// blocks and shows the Apex line. A node is "Blocked by the Apex" only when the post states a Blocks list naming
// that type (slotGrid); with no stated list the Apex line says "No blocked slots are stated."
// Without JavaScript every node and (in the Apex card below the bench) the Apex details read as plain content.
// Under 720px the image is hidden and the nodes stack as a list, toggle above. Server component.
import { WEAPON_IMAGE, slotGrid, apexOf, apexBlocksText, weaponImageSet, weaponImageAlt } from '@/lib/dmz/weapons';
import { APEX_NOTES } from '@/lib/dmz/weaponApexNotes';
import { BENCH_CSS } from './weaponArmoryCss.js';
import BenchToggle from './BenchToggle.js';

var ROOT_ID = 'bench';
export var NO_BLOCKS_STATED = 'No blocked slots are stated.';
export var BLOCKED_LABEL = 'Blocked by the Apex';

function Node({ slot }) {
  return (
    <li className={'wb-node' + (slot.blocked ? ' bl' : '')}>
      <span className="wb-nm">{slot.name}</span>
      {slot.blocked ? <span className="wb-st">{BLOCKED_LABEL}</span> : null}
    </li>
  );
}

export default function WeaponBench({ row }) {
  var grid = slotGrid(row);
  if (grid.slots.length === 0) return null;
  var apex = apexOf(row);
  var img = weaponImageSet(row, WEAPON_IMAGE.heroSizes);
  var half = Math.ceil(grid.slots.length / 2);
  var mechanic = apex ? APEX_NOTES[row.slug] || null : null;
  return (
    <section className="wb" id={ROOT_ID} data-apex="off" aria-labelledby="wb-title">
      <style dangerouslySetInnerHTML={{ __html: BENCH_CSS }} />
      <div className="wb-head">
        <h2 className="wb-title" id="wb-title">GUNSMITH BENCH</h2>
        <span className="wb-illus">Illustrative layout</span>
      </div>
      <p className="wb-note">The attachment types the launch post lists for the {row.name}. The arrangement is ours, not the in-game Gunsmith layout.</p>
      {apex ? <div className="wb-ctl"><BenchToggle rootId={ROOT_ID} /></div> : null}
      <div className="wb-stage" role="group" aria-label={'Attachment types for the ' + row.name}>
        <ul className="wb-row">{grid.slots.slice(0, half).map(function (s) { return <Node key={s.name} slot={s} />; })}</ul>
        {img ? (
          <div className="wb-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} srcSet={img.srcSet} sizes={img.sizes} width={img.width} height={img.height}
              alt={weaponImageAlt(row)} loading="lazy" decoding="async" />
          </div>
        ) : null}
        <ul className="wb-row">{grid.slots.slice(half).map(function (s) { return <Node key={s.name} slot={s} />; })}</ul>
      </div>
      {apex ? (
        <p className="wb-apex" aria-live="polite">
          <strong>{apex.name}</strong>{mechanic ? ': ' + mechanic : ''}
          <span className="wb-apexb">{grid.blocksStated ? apexBlocksText(apex) : NO_BLOCKS_STATED}</span>
        </p>
      ) : null}
    </section>
  );
}

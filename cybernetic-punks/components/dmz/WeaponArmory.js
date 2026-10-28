// components/dmz/WeaponArmory.js
// The /dmz/weapons ARMORY section (Brief 168): a counts strip built from the rows, class tabs (ArmoryTabs,
// progressive enhancement) and an image card per weapon, grouped by class in post order. Server component; every class section is in the HTML, so the page reads without JS.
// Tags: green "Confirmed" only on verified rows; an amber tag on a weapon with a source note
// (weaponFlags). One image credit line in the section footer (not per card). Card images: the first row loads eagerly (the first image with high priority), the rest lazily.
// Brief 211: restyled onto the hub kit, no framed panel (each card is a CutCard; armoryCss in weaponArmoryCss.js reads
// the --hk-* properties). Same ids, classes, links and fields.
import CutCard from '@/components/game/CutCard';
import {
  WEAPONS_HUB, WEAPON_IMAGE, sortWeapons, classTabs, hubCounts, weaponCardStats, weaponFlags, weaponImageSet,
  weaponImageAlt, classLabel,
} from '@/lib/dmz/weapons';
import { armoryCss } from './weaponArmoryCss.js';
import ArmoryTabs from './ArmoryTabs.js';

var ROOT_ID = 'armory';
var EAGER = 4; // the first row at desktop width

export default function WeaponArmory({ rows, classNames }) {
  var sorted = sortWeapons(rows);
  var tabs = classTabs(sorted, classNames);
  var counts = hubCounts(sorted);
  var index = 0;
  return (
    <section className="wa" id={ROOT_ID} data-filter="all" aria-labelledby="wa-title">
      <style dangerouslySetInnerHTML={{ __html: armoryCss(tabs.map(function (t) { return t.slug; })) }} />
      <div className="wa-head">
        <h2 className="wa-title" id="wa-title">ARMORY</h2>
      </div>
      <ul className="wa-counts" aria-label="Counts from the weapons listed">
        <li><b>{counts.weapons}</b>weapons</li>
        <li><b>{counts.withApex}</b>with an Apex</li>
        <li><b>{counts.classes}</b>classes</li>
        {counts.flagged > 0 ? <li><b>{counts.flagged}</b>with a source note</li> : null}
      </ul>
      <ArmoryTabs tabs={tabs} rootId={ROOT_ID} />
      {tabs.map(function (t) {
        var list = sorted.filter(function (r) { return r.class_slug === t.slug; });
        return (
          <section key={t.slug} id={t.slug} className="wa-sec" data-cls={t.slug} aria-labelledby={'wa-h-' + t.slug}>
            <h3 className="wa-sech" id={'wa-h-' + t.slug}>{t.label}<small>{t.count}</small></h3>
            <ul className="wa-grid">
              {list.map(function (r) {
                var i = index++;
                var img = weaponImageSet(r, WEAPON_IMAGE.cardSizes);
                var flags = weaponFlags(r);
                return (
                  <li key={r.slug}>
                    <CutCard className="wa-card" href={WEAPONS_HUB.routeBase + '/' + r.slug}>
                      {img ? (
                        <div className="wa-img">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.src} srcSet={img.srcSet} sizes={img.sizes} width={img.width} height={img.height}
                            alt={weaponImageAlt(r)} loading={i < EAGER ? 'eager' : 'lazy'} fetchPriority={i === 0 ? 'high' : undefined} decoding="async" />
                        </div>
                      ) : null}
                      <p className="wa-name">{r.name}</p>
                      <p className="wa-cls">{classLabel(r, classNames && classNames[r.class_slug])}</p>
                      <dl className="wa-stats">
                        {weaponCardStats(r).map(function (s) {
                          return <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>;
                        })}
                      </dl>
                      {r.verified === true || flags.length > 0 ? (
                        <div className="wa-tags">
                          {r.verified === true ? <span className="wa-tag">Confirmed</span> : null}
                          {flags.length > 0 ? <span className="wa-glitch">Source note</span> : null}
                        </div>
                      ) : null}
                    </CutCard>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p className="wa-foot">{WEAPON_IMAGE.hubCredit}</p>
    </section>
  );
}

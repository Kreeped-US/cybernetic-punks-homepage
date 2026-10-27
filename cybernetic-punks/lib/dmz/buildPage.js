// lib/dmz/buildPage.js
// Pure copy helpers for the DMZ weapon-build page (app/dmz/builds/[weapon]/page.js + components/dmz/DmzBuildView.js),
// factored out so they are unit-testable without the supabase singleton. Brief 178 honesty rules:
// - no ranking claim ("best") in the title, H1 or description;
// - a grade is shown only when the build row stores one of the known grades (never a default letter);
// - "verified" wording only when every cited row is verified (isBuildIndexable true), and it says what is true:
//   checked against its source, not "verified in-game".

export var BUILD_GRADES = ['S', 'A', 'B', 'C', 'D'];

// Title <= 60, keyword-relevant: "[Weapon] Build - MW4 DMZ". Guard for long weapon names.
export function buildTitle(weaponName) {
  var full = weaponName + ' Build - MW4 DMZ';
  if (full.length <= 60) return full;
  var shorter = weaponName + ' Build - DMZ';
  if (shorter.length <= 60) return shorter;
  return (weaponName + ' Build').slice(0, 60);
}

// The page H1: names the weapon and the build, no ranking.
export function buildH1(weaponName) {
  return 'MW4 DMZ ' + weaponName + ' Build: FOB Gunsmith Loadout';
}

// Meta description for one resolved build. confirmed = isBuildIndexable(resolved).
export function buildDescription(weaponName, buildJson, confirmed) {
  var bj = buildJson || {};
  var hasApex = !!(bj.apex_attachment && bj.apex_attachment.attachment_slug);
  return 'The MW4 DMZ ' + weaponName + ' build for the FOB Gunsmith: attachments by slot'
    + (hasApex ? ' plus the Apex attachment' : '') + '. '
    + (confirmed ? 'Every part is verified against its source.' : 'Not every part is verified yet.');
}

// The stored grade, or null: no default and no placeholder letter.
export function buildGrade(buildJson) {
  var g = buildJson && typeof buildJson.loadout_grade === 'string' ? buildJson.loadout_grade.trim().toUpperCase() : '';
  return BUILD_GRADES.indexOf(g) >= 0 ? g : null;
}

// scripts/gen-attachment-matcher.mjs
// Generates a LOCAL, self-contained image-matching dev tool for the Wardogs attachment catalog.
// Reads: the 204 attachments (name+slot) from the load migration, the .webp files in
// public/images/wardogs/, and the wardogs weapon roster's image_filename set (to EXCLUDE weapon
// renders). Auto-fuzzy-matches descriptive filenames; bakes everything into an HTML page with a
// slot-filtered VISUAL PICKER + UPDATE-SQL export. NO DB writes. NO auto-population -- the operator
// picks + runs the SQL. Open the output over file:// (it references ../public/images/... relatively).
// Run: node scripts/gen-attachment-matcher.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const LOAD_SQL = 'docs/migrations/2026-09-15-wardogs-attachments-load.sql';
const IMG_DIR = 'public/images/wardogs';
const OUT = 'scripts/wardogs-attachment-matcher.html';

// --- 1. attachments (name + slot) from the load migration ---
const sql = readFileSync(LOAD_SQL, 'utf8');
const attachments = [];
const re = /VALUES \('wardogs', '((?:[^']|'')+)', '([^']*)',/g;
let m;
while ((m = re.exec(sql))) attachments.push({ name: m[1].replace(/''/g, "'"), slot: m[2] });
console.log('attachments parsed:', attachments.length);

// --- 2. image files, classified ---
const files = readdirSync(IMG_DIR).filter(f => /\.webp$/i.test(f));
// weapon renders to EXCLUDE: the roster's image_filename set (read-only) + a defensive name check.
const env = {};
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) { const x = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/); if (x) env[x[1]] = x[2].replace(/^["']|["']$/g, ''); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
const wpRows = (await sb.from('weapon_stats').select('image_filename').eq('game_slug', 'wardogs')).data || [];
const weaponFiles = new Set(wpRows.map(r => r.image_filename).filter(Boolean).map(s => s.toLowerCase()));
const SLOT_PREFIX = { muzl_: 'muzzle', mzl_: 'muzzle', magz_: 'magazine', sght_: 'optic', fgrp_: 'foregrip', fgp_: 'foregrip' };
function fileSlot(f) { for (const p of Object.keys(SLOT_PREFIX)) if (f.toLowerCase().startsWith(p)) return SLOT_PREFIX[p]; return null; }
const norm = s => s.toLowerCase().replace(/\.webp$/, '').replace(/[^a-z0-9]/g, '');
const images = files
  .filter(f => !weaponFiles.has(f.toLowerCase()))
  .map(f => ({ file: f, slot: fileSlot(f), norm: norm(f), coded: !!fileSlot(f) }));
// Also drop files whose normalized name equals a roster weapon's normalized name (defensive, in case
// image_filename in DB differs from the on-disk name).
const rosterNorm = new Set(wpRows.map(r => r.image_filename).filter(Boolean).map(norm));
const imagesFinal = images.filter(im => !rosterNorm.has(im.norm));
console.log('images total:', files.length, '| excluded weapon renders:', files.length - imagesFinal.length, '| candidate attachment images:', imagesFinal.length);
console.log('coded (slot-prefixed):', imagesFinal.filter(i => i.coded).length, '| descriptive:', imagesFinal.filter(i => !i.coded).length);

// --- 3. AUTO-MATCH: exact-normalized attachment name == descriptive filename ---
const byNormImg = new Map();
imagesFinal.forEach(im => { if (!im.coded) { if (!byNormImg.has(im.norm)) byNormImg.set(im.norm, im.file); } });
let auto = 0;
attachments.forEach(a => {
  const n = norm(a.name);
  if (byNormImg.has(n)) { a.autoImage = byNormImg.get(n); a.autoConf = 'exact'; auto++; }
});
console.log('AUTO-MATCHED (exact-normalized):', auto);

// --- 4. emit the self-contained HTML tool ---
const data = { attachments, images: imagesFinal, generatedAt: new Date().toISOString() };
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Wardogs Attachment Image Matcher</title>
<style>
 body{font:14px system-ui,sans-serif;margin:0;background:#0b0d10;color:#e6e8ec}
 header{position:sticky;top:0;background:#12151a;border-bottom:1px solid #262b33;padding:10px 16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;z-index:5}
 h1{font-size:15px;margin:0;color:#e0a13a;letter-spacing:1px}
 .stat{font:12px monospace;color:#8b929c}
 button{font:inherit;background:#e0a13a;color:#0b0d10;border:0;border-radius:4px;padding:7px 12px;font-weight:700;cursor:pointer}
 button.ghost{background:transparent;color:#e0a13a;border:1px solid #e0a13a}
 select,input{font:inherit;background:#12151a;color:#e6e8ec;border:1px solid #262b33;border-radius:4px;padding:6px 8px}
 main{padding:14px 16px}
 .att{border:1px solid #1d2026;border-radius:8px;margin:0 0 10px;background:#0e1116;overflow:hidden}
 .att.done{border-color:#5bd18e55}
 .att-h{display:flex;gap:12px;align-items:center;padding:10px 14px;cursor:pointer}
 .att-h .nm{font-weight:700}
 .att-h .sl{font:11px monospace;color:#8b929c;text-transform:uppercase;letter-spacing:1px}
 .att-h .pick{margin-left:auto;font:12px monospace;color:#5bd18e}
 .att-h .none{margin-left:auto;font:12px monospace;color:#8b929c}
 .cands{display:none;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;padding:12px 14px;border-top:1px solid #1d2026}
 .att.open .cands{display:grid}
 .cand{border:1px solid #262b33;border-radius:6px;padding:6px;text-align:center;cursor:pointer;background:#12151a}
 .cand:hover{border-color:#e0a13a}
 .cand.sel{border-color:#5bd18e;box-shadow:0 0 0 1px #5bd18e}
 .cand img{width:100%;height:80px;object-fit:contain;background:#0b0d10;border-radius:3px}
 .cand .fn{font:10px monospace;color:#8b929c;word-break:break-all;margin-top:4px}
 .filt{display:flex;gap:8px;align-items:center;margin:0 0 12px;flex-wrap:wrap}
 dialog{background:#12151a;color:#e6e8ec;border:1px solid #262b33;border-radius:8px;max-width:90vw;width:820px}
 textarea{width:100%;height:50vh;background:#0b0d10;color:#e6e8ec;border:1px solid #262b33;border-radius:4px;font:12px monospace;padding:10px}
 .badge{font:10px monospace;padding:1px 6px;border-radius:3px;border:1px solid #262b33;color:#8b929c}
</style></head><body>
<header>
 <h1>WARDOGS ATTACHMENT IMAGE MATCHER</h1>
 <span class="stat" id="prog"></span>
 <span class="filt"><label class="stat">Slot <select id="slotF"><option value="">all</option></select></label>
 <label class="stat"><input type="checkbox" id="hideDone"> hide matched</label>
 <label class="stat"><input type="checkbox" id="onlyImgless"> only slots with candidate images</label></span>
 <button onclick="exportSQL()">Generate SQL</button>
 <button class="ghost" onclick="localStorage.removeItem(LSK);location.reload()">Reset progress</button>
</header>
<main id="list"></main>
<dialog id="sqlDlg"><h3 style="color:#e0a13a">UPDATE SQL -- run in Supabase (rule 2)</h3>
 <textarea id="sqlOut" readonly></textarea>
 <div style="margin-top:8px;display:flex;gap:8px"><button onclick="copySQL()">Copy</button><button class="ghost" onclick="dlSQL()">Download .sql</button><button class="ghost" onclick="sqlDlg.close()">Close</button></div>
</dialog>
<script>
const DATA = ${JSON.stringify(data)};
const LSK = 'wardogs-att-matcher-v1';
const IMG = '../public/images/wardogs/';
let picks = {}; try{ picks = JSON.parse(localStorage.getItem(LSK)||'{}'); }catch(e){}
// seed auto-matches (only if the operator has not already set/cleared that attachment)
DATA.attachments.forEach(a=>{ if(a.autoImage && !(a.name in picks)) picks[a.name]=a.autoImage; });
function save(){ localStorage.setItem(LSK, JSON.stringify(picks)); }
const imgsBySlot = {}; DATA.images.forEach(im=>{ (imgsBySlot[im.slot||'_generic']=imgsBySlot[im.slot||'_generic']||[]).push(im); });
const slots = [...new Set(DATA.attachments.map(a=>a.slot))].sort();
const slotF = document.getElementById('slotF'); slots.forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;slotF.appendChild(o);});
function candidatesFor(slot){
  // slot-matching coded/descriptive images + all descriptive (generic) images as a fallback pool
  const exact = (imgsBySlot[slot]||[]);
  const generic = DATA.images.filter(im=>!im.coded); // descriptive files can fit any slot
  const seen=new Set(); const out=[];
  [...exact, ...generic].forEach(im=>{ if(!seen.has(im.file)){seen.add(im.file);out.push(im);} });
  return out;
}
function render(){
  const host=document.getElementById('list'); host.innerHTML='';
  const fS=slotF.value, hd=document.getElementById('hideDone').checked, oi=document.getElementById('onlyImgless').checked;
  let done=0; DATA.attachments.forEach(a=>{ if(picks[a.name])done++; });
  document.getElementById('prog').textContent = done+' / '+DATA.attachments.length+' matched  ('+(DATA.attachments.length-done)+' left)';
  DATA.attachments.forEach((a,idx)=>{
    if(fS && a.slot!==fS) return;
    const has=!!picks[a.name];
    if(hd && has) return;
    if(oi && candidatesFor(a.slot).length===0) return;
    const el=document.createElement('div'); el.className='att'+(has?' done':'');
    const cand=candidatesFor(a.slot);
    el.innerHTML='<div class="att-h"><span class="nm">'+a.name+'</span><span class="sl">'+a.slot+'</span>'+
      (has?'<span class="pick">IMG '+picks[a.name]+' &#10003;</span>':'<span class="none">'+cand.length+' candidates &rarr;</span>')+'</div>'+
      '<div class="cands"></div>';
    const cc=el.querySelector('.cands');
    cand.forEach(im=>{ const c=document.createElement('div'); c.className='cand'+(picks[a.name]===im.file?' sel':'');
      c.innerHTML='<img loading="lazy" src="'+IMG+im.file.replace(/"/g,'&quot;')+'"><div class="fn">'+im.file+(im.coded?' <span class=badge>'+im.slot+'</span>':'')+'</div>';
      c.onclick=()=>{ if(picks[a.name]===im.file){delete picks[a.name];}else{picks[a.name]=im.file;} save(); render(); };
      cc.appendChild(c); });
    // a "no image" clear button
    const clr=document.createElement('div'); clr.className='cand'; clr.style.display='flex'; clr.style.alignItems='center'; clr.style.justifyContent='center';
    clr.innerHTML='<span class="fn">&#10007; no image / clear</span>'; clr.onclick=()=>{ delete picks[a.name]; save(); render(); };
    cc.appendChild(clr);
    el.querySelector('.att-h').onclick=()=>{ el.classList.toggle('open'); };
    host.appendChild(el);
  });
}
function sqlText(){
  const lines=['-- Wardogs attachment image matches -- run in Supabase (rule 2). Generated '+new Date().toISOString(),
    '-- Only attachments the operator matched are updated; unmatched stay image_filename=NULL (honest).',''];
  DATA.attachments.forEach(a=>{ if(picks[a.name]){ const nm=a.name.replace(/'/g,"''"), fn=picks[a.name].replace(/'/g,"''");
    lines.push("UPDATE wardogs_attachments SET image_filename='"+fn+"' WHERE game_slug='wardogs' AND name='"+nm+"';"); }});
  return lines.join('\\n');
}
function exportSQL(){ document.getElementById('sqlOut').value=sqlText(); document.getElementById('sqlDlg').showModal(); }
function copySQL(){ navigator.clipboard.writeText(document.getElementById('sqlOut').value); }
function dlSQL(){ const b=new Blob([sqlText()],{type:'text/plain'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='wardogs-attachment-images.sql'; a.click(); URL.revokeObjectURL(u); }
['change'].forEach(ev=>{slotF.addEventListener(ev,render);document.getElementById('hideDone').addEventListener(ev,render);document.getElementById('onlyImgless').addEventListener(ev,render);});
save(); render();
</script></body></html>`;
writeFileSync(OUT, html);
console.log('\\nwrote', OUT, '-- open it in a browser via file:// (it loads images from ../public/images/wardogs/)');

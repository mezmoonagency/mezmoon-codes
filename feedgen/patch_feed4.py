# 08d -> 08e: Video tile üçün örtük (cover) şəkli seçmək
import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
assert s.count('APP_VERSION="2026.11.08d"')==1
s=s.replace('APP_VERSION="2026.11.08d"','APP_VERSION="2026.11.08e"')

# 1) feedOf: covers sahəsi
r_old='function feedOf(cl){feedLoad();return FEEDS[cl]||(FEEDS[cl]={order:[],plan:{},pal:[]});}'
assert s.count(r_old)==1
s=s.replace(r_old,'function feedOf(cl){feedLoad();const f=FEEDS[cl]||(FEEDS[cl]={order:[],plan:{},pal:[],covers:{}});if(!f.covers)f.covers={};return f;}')

# 2) feedAnalyze: örtüyü nəzərə al
a_old='const im=await fLoad(fThumb(id,400));'
assert s.count(a_old)==1
s=s.replace(a_old,'const cov=(fd.covers&&fd.covers[id])||id;const im=await fLoad(fThumb(cov,400));')

# 3) feedPlanBody daxilində: cover dəyişəni, img mənbəyi, 🖼 düyməsi və bağlama
pb_s=s.find("function feedPlanBody(box,v,fd){")
pb_e=s.find("function feedPick(v,lib,fd){")
assert pb_s>0 and pb_e>pb_s
seg=s[pb_s:pb_e]

assert seg.count('const ord=fd.order.slice(0,9);')==1
seg=seg.replace('const ord=fd.order.slice(0,9);','const ord=fd.order.slice(0,9);if(!fd.covers)fd.covers={};')

assert seg.count('const m=byId[id];const t=el("div");t.draggable=true;t.dataset.i=i;')==1
seg=seg.replace('const m=byId[id];const t=el("div");t.draggable=true;t.dataset.i=i;',
                'const m=byId[id];const cov=(fd.covers[id]||id);const t=el("div");t.draggable=true;t.dataset.i=i;')

assert seg.count('+fThumb(id,400)+')==1
seg=seg.replace('+fThumb(id,400)+','+fThumb(cov,400)+')

assert seg.count('+feedBadge(m)')==1
seg=seg.replace('+feedBadge(m)',
  '+feedBadge(m)+(String(m.mime).startsWith("video/")?\'<button data-fcov title="Örtük şəklini seç" style="position:absolute;left:3px;top:24px;width:22px;height:20px;border-radius:7px;background:rgba(0,0,0,.6);color:#fff;border:none;cursor:pointer;font-size:11px;line-height:1">🖼</button>\':"")')

dwire='t.querySelector("[data-fdel]").onclick=e=>{e.stopPropagation();fd.order.splice(fd.order.indexOf(id),1);delete fd.plan[id];feedSave();render();};'
assert seg.count(dwire)==1
seg=seg.replace(dwire,dwire+'const _cb=t.querySelector("[data-fcov]");if(_cb)_cb.onclick=e=>{e.stopPropagation();feedCoverPick(v,id,lib,fd);};')

s=s[:pb_s]+seg+s[pb_e:]

# 4) feedCoverPick funksiyası (feedPalBar-dan əvvəl)
anchor='function feedPalBar(fd,palBar){'
assert s.count(anchor)==1
COVER=r'''function feedCoverPick(v,vid,lib,fd){const imgs=lib.filter(m=>String(m.mime).startsWith("image/"));
  const scrim=el("div","scrim");
  const tiles='<button type="button" data-cauto title="Drive avtomatik kadrı" style="padding:0;border:1px solid var(--border);border-radius:8px;cursor:pointer;background:var(--surface-2);color:var(--muted);aspect-ratio:3/4;font-size:12px">Avto<br>kadr</button>'+imgs.map(m=>'<button type="button" data-cp="'+esc(m.drive_id)+'" title="'+esc(m.name)+'" style="padding:0;border:1px solid var(--border);border-radius:8px;overflow:hidden;cursor:pointer;background:#1a1a1a;aspect-ratio:3/4;position:relative;display:block"><img src="'+fThumb(m.drive_id,200)+'" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.display=\'none\'">'+(m.kind==="dizayn"?'<span style="position:absolute;left:3px;top:3px;font-size:11px">🎨</span>':"")+'</button>').join("");
  scrim.innerHTML='<div class="modal" style="max-width:640px"><div class="mh"><h3>🖼 Video örtüyü</h3><button data-x>×</button></div><div class="mb"><div class="hint" style="margin:0 0 8px;white-space:normal">Videonun grid örtüyü üçün şəkil seç (çəkiliş fotosu və ya dizayn). Qeyd: Google Drive videonun daxili kadrını seçməyə icazə vermir, ona görə örtük kimi hazır şəkil təyin olunur.</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px;max-height:52vh;overflow:auto">'+tiles+'</div></div></div>';
  document.body.appendChild(scrim);const close=()=>scrim.remove();scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  scrim.querySelector("[data-cauto]").onclick=()=>{delete fd.covers[vid];feedSave();close();render();};
  scrim.querySelectorAll("[data-cp]").forEach(b=>b.onclick=()=>{fd.covers[vid]=b.dataset.cp;feedSave();close();render();});}
'''
s=s.replace(anchor,COVER+anchor)

open(dst,"w").write(s)
print("ok bytes:",len(s))

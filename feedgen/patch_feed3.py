# 08c -> 08d: Material seçimində video/foto/dizayn hamısı nişanla görünsün; planlanan feed 3x3 (9 şəkil), nəticə 9-a görə
import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
assert s.count('APP_VERSION="2026.11.08c"')==1
s=s.replace('APP_VERSION="2026.11.08c"','APP_VERSION="2026.11.08d"')

# --- 1) feedPlanBody-ni 3x3 (9 slot) versiya ilə əvəz et ---
old_pb_start=s.find("function feedPlanBody(box,v,fd){")
old_pb_end=s.find("function feedPick(v,lib,fd){")
assert old_pb_start>0 and old_pb_end>old_pb_start
NEW_PB=r'''function feedBadge(m){const vid=String(m.mime).startsWith("video/");if(vid)return'<span style="position:absolute;left:3px;top:3px;font-size:12px;filter:drop-shadow(0 1px 2px #000)">🎬</span>';if(m.kind==="dizayn")return'<span style="position:absolute;left:3px;top:3px;font-size:12px;filter:drop-shadow(0 1px 2px #000)">🎨</span>';return"";}
function feedPlanBody(box,v,fd){
  const lib=smmLibrary(v).filter(m=>m.drive_id&&(String(m.mime).startsWith("image/")||String(m.mime).startsWith("video/")));
  const byId={};lib.forEach(m=>byId[m.drive_id]=m);fd.order=fd.order.filter(id=>byId[id]);
  const ord=fd.order.slice(0,9);
  const bar=el("div");bar.style.cssText="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px";
  bar.innerHTML='<span style="font-size:12.5px;color:var(--muted)">feed uyğunluğu:</span><b data-fov style="font-size:18px;color:var(--muted)">…</b><span style="font-size:12.5px;color:var(--muted)">'+ord.length+'/9 post</span>'+(ord.length<9?'<button class="btn sm" data-fadd style="margin-left:auto">+ Material əlavə et</button>':'<span class="hint" style="margin-left:auto">9-luq feed doludur</span>');
  box.appendChild(bar);
  const palBar=el("div");palBar.style.cssText="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px";box.appendChild(palBar);
  const grid=el("div");grid.style.cssText="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;background:#000;padding:3px;border-radius:10px;max-width:420px";
  for(let i=0;i<9;i++){
    if(i<ord.length){const id=ord[i];const m=byId[id];const t=el("div");t.draggable=true;t.dataset.i=i;
      t.style.cssText="position:relative;aspect-ratio:3/4;overflow:hidden;background:#1a1a1a;cursor:grab;border-radius:2px"+(fd.plan[id]?";outline:2px dashed rgba(255,255,255,.55);outline-offset:-3px":"");
      t.innerHTML='<img src="'+fThumb(id,400)+'" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;display:block;pointer-events:none" onerror="this.style.display=\'none\'">'
        +'<span data-fb style="position:absolute;right:3px;top:3px;font-size:11px;font-weight:700;padding:1px 6px;border-radius:9px;background:rgba(0,0,0,.65);color:#999">…</span>'
        +feedBadge(m)
        +(fd.plan[id]?'<span style="position:absolute;left:4px;bottom:4px;font-size:9px;font-weight:700;letter-spacing:.5px;background:rgba(0,0,0,.6);color:#fff;padding:1px 5px;border-radius:6px">PLAN</span>':'')
        +'<button data-fdel title="Gridən çıxar" style="position:absolute;right:3px;bottom:3px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:none;cursor:pointer;font-size:13px;line-height:1">×</button>';
      t.ondragstart=()=>{fDrag=i;};t.ondragover=e=>e.preventDefault();
      t.ondrop=e=>{e.preventDefault();if(fDrag==null||fDrag===i)return;const it=fd.order.splice(fDrag,1)[0];fd.order.splice(i,0,it);feedSave();render();};
      t.onclick=e=>{if(e.target.closest("[data-fdel]"))return;fd.plan[id]=!fd.plan[id];feedSave();render();};
      t.querySelector("[data-fdel]").onclick=e=>{e.stopPropagation();fd.order.splice(fd.order.indexOf(id),1);delete fd.plan[id];feedSave();render();};
      grid.appendChild(t);
    }else{const t=el("div");t.style.cssText="position:relative;aspect-ratio:3/4;border-radius:2px;background:var(--surface-2);border:1px dashed var(--border);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:24px;cursor:pointer";t.textContent="+";t.title="Material əlavə et";t.onclick=()=>feedPick(v,lib,fd);grid.appendChild(t);}
  }
  box.appendChild(grid);
  box.appendChild(el("div","hint","Hazır 9-luq feed (3×3). Kəsik xətt = planlanmış post · sürüşdürüb yerini dəyiş · kliklə plan/paylaşılıb · × ilə çıxar. Balın rəngi: yaşıl 80+, sarı 60–79, qırmızı <60."));
  box.appendChild(el("div","hint","Qeyd: planlanan feed və palitra hələ yalnız bu brauzerdə saxlanılır. Bütün komanda eyni görsün deyə bazaya sütun əlavə edə bilərik."));
  const addb=bar.querySelector("[data-fadd]");if(addb)addb.onclick=()=>feedPick(v,lib,fd);
  setTimeout(()=>feedAnalyze(ord,fd,grid,bar.querySelector("[data-fov]"),palBar),30);}
'''
s=s[:old_pb_start]+NEW_PB+s[old_pb_end:]

# --- 2) feedPick-i tip nişanları + adla, çoxlu seçim, 9 limiti ilə əvəz et ---
pick_start=s.find("function feedPick(v,lib,fd){")
pick_end=s.find("async function feedAnalyze(")
assert pick_start>0 and pick_end>pick_start
NEW_PICK=r'''function feedPick(v,lib,fd){
  const scrim=el("div","scrim");const body=el("div","mb");
  function draw(){const inSet=new Set(fd.order);const avail=lib.filter(m=>!inSet.has(m.drive_id));
    if(fd.order.length>=9){body.innerHTML='<div class="hint" style="white-space:normal">9-luq feed doludur. Yeni material üçün əvvəlcə birini gridən çıxar (×).</div>';return;}
    if(!avail.length){body.innerHTML='<div class="hint" style="white-space:normal">Bu məkanda grid-ə əlavə oluna biləcək foto/video/dizayn yoxdur. Çəkiliş videoları və dizaynlar «🗂 Materiallar» tabında görünür; əlavə fayl üçün ora «Yüklə» bas.</div>';return;}
    body.innerHTML='<div class="hint" style="margin:0 0 8px">Foto 📷 · Video 🎬 · Dizayn 🎨 — klik ilə gridə əlavə et ('+fd.order.length+'/9)</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;max-height:56vh;overflow:auto">'+avail.map(m=>{const vid=String(m.mime).startsWith("video/");const ic=vid?"🎬":(m.kind==="dizayn"?"🎨":"📷");return '<button type="button" data-fp="'+esc(m.drive_id)+'" title="'+esc(m.name)+'" style="padding:0;border:1px solid var(--border);border-radius:8px;overflow:hidden;cursor:pointer;background:#1a1a1a;aspect-ratio:3/4;position:relative;display:block"><img src="'+fThumb(m.drive_id,200)+'" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.display=\'none\'"><span style="position:absolute;left:3px;top:3px;font-size:12px;filter:drop-shadow(0 1px 2px #000)">'+ic+'</span><span style="position:absolute;left:0;right:0;bottom:0;font-size:9.5px;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.8));padding:8px 4px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(m.name)+'</span></button>';}).join("")+'</div>';
    body.querySelectorAll("[data-fp]").forEach(b=>b.onclick=()=>{if(fd.order.length>=9)return;fd.order.push(b.dataset.fp);feedSave();draw();});}
  scrim.innerHTML='<div class="modal" style="max-width:660px"><div class="mh"><h3>🗂 Materiallardan əlavə et</h3><button data-x>×</button></div></div>';
  scrim.querySelector(".modal").appendChild(body);
  document.body.appendChild(scrim);const close=()=>{scrim.remove();render();};scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  draw();}
'''
s=s[:pick_start]+NEW_PICK+s[pick_end:]

# --- 3) feedAnalyze-i ord (9-a qədər) üzərindən işlə ---
an_start=s.find("async function feedAnalyze(")
an_end=s.find("function feedPalBar(")
assert an_start>0 and an_end>an_start
NEW_AN=r'''async function feedAnalyze(ord,fd,grid,ov,palBar){
  const ids=ord.slice();
  if(!ids.length){if(ov){ov.textContent="—";ov.style.color="var(--muted)";}feedPalBar(fd,palBar);return;}
  const doms={};for(const id of ids){const im=await fLoad(fThumb(id,400));if(im){const d=fDominants(im);if(d)doms[id]=d;}}
  const got=Object.keys(doms).length;
  if((!fd.pal||!fd.pal.length)&&got){const all=[];Object.values(doms).forEach(ds=>ds.forEach(d=>all.push(d)));all.sort((a,b)=>b.w-a.w);const pick=[];for(const d of all){const lab=fRgb2lab(d.rgb[0],d.rgb[1],d.rgb[2]);if(pick.every(p=>fDE(lab,fRgb2lab(p[0],p[1],p[2]))>20))pick.push([Math.round(d.rgb[0]),Math.round(d.rgb[1]),Math.round(d.rgb[2])]);if(pick.length>=5)break;}fd.pal=pick;feedSave();}
  feedPalBar(fd,palBar);
  let sum=0,cnt=0;
  grid.querySelectorAll("[data-i]").forEach(t=>{const id=ord[+t.dataset.i];const sc=fScore(doms[id],fd.pal);const b=t.querySelector("[data-fb]");if(b){b.textContent=sc==null?"—":sc;b.style.color=fCol(sc);}if(sc!=null){sum+=sc;cnt++;}});
  if(ov){const avg=cnt?Math.round(sum/cnt):null;ov.textContent=avg==null?(got?"—":"şəkil oxunmadı"):avg+"%";ov.style.color=fCol(avg);if(!got)ov.style.fontSize="12px";}}
'''
s=s[:an_start]+NEW_AN+s[an_end:]

open(dst,"w").write(s)
print("ok bytes:",len(s))

# 09g -> 09h: (A) foto qovluqları feedPick-də, (B) ümumi faiz düzgün (CORS-safe Drive yükləmə, canlı gözləmə yoxdur), (C) feedTile tolerant + fd.extra
import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
assert s.count('APP_VERSION="2026.11.09g"')==1
s=s.replace('APP_VERSION="2026.11.09g"','APP_VERSION="2026.11.09h"')

def repl_range(a_pat,b_pat,new):
    global s
    a=s.find(a_pat);b=s.find(b_pat,a+5)
    assert a>0 and b>a,(a_pat[:40],a,b)
    s=s[:a]+new+s[b:]

# (C1) feedTile: m yoxdursa foto kimi davran (qovluqdan əlavə olunan fayl)
old_tile='function feedTile(id,i,m,fd,v,lib){const t=el("div");t.draggable=true;t.dataset.i=i;'
assert s.count(old_tile)==1
s=s.replace(old_tile,'function feedTile(id,i,m,fd,v,lib){m=m||{mime:"image/jpeg",kind:"foto",name:"Foto"};const t=el("div");t.draggable=true;t.dataset.i=i;')

# (C2) feedPlanBody byId: fd.extra birləşdir
old_byid='const byId={};lib.forEach(m=>byId[m.drive_id]=m);fd.order=fd.order.filter(id=>byId[id]);'
assert s.count(old_byid)==1
s=s.replace(old_byid,'const byId={};lib.forEach(m=>byId[m.drive_id]=m);if(fd.extra)Object.keys(fd.extra).forEach(id=>{if(!byId[id])byId[id]=fd.extra[id];});fd.order=fd.order.filter(id=>byId[id]);')

# (B) feedAnalyze: CORS-safe Drive yükləmə + canlı gözləmə yox + örtük-agah
NEW_AN=r'''function feedCoverId(id,fd){const c=fd.covers&&fd.covers[id];if(c)return String(c).startsWith("data:")?{d:c}:{id:c};return {id:id};}
async function fLoadDrive(id){
  try{ if(typeof driveConnected==="function"&&driveConnected()){
    const token=await gToken();
    const r=await fetch("https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(id)+"?fields=thumbnailLink&supportsAllDrives=true",{headers:{Authorization:"Bearer "+token}});
    if(r.ok){const j=await r.json();let tl=j.thumbnailLink;if(tl){tl=tl.replace(/=s\d+(-c)?$/,"=s400");try{const b=await fetch(tl);if(b.ok){const im=await fLoad(URL.createObjectURL(await b.blob()));if(im)return im;}}catch(e){}}}
  }}catch(e){}
  return await fLoad(fThumb(id,400));}
async function feedAnalyze(ord,fd,grid,ov,palBar,ovbar,v){
  const ids=ord.slice();
  const setOv=(txt,col,pct)=>{if(ov){ov.textContent=txt;ov.style.color=col;ov.title="";}if(ovbar){ovbar.style.width=(pct||0)+"%";ovbar.style.background=col;}};
  if(!ids.length){setOv("—","var(--muted)",0);feedPalBar(fd,palBar,v);return;}
  const doms={};for(const id of ids){const ci=feedCoverId(id,fd);const im=ci.d?await fLoad(ci.d):await fLoadDrive(ci.id);if(im){const d=fDominants(im);if(d)doms[id]=d;}}
  const got=Object.keys(doms).length;
  if((!fd.pal||!fd.pal.length)&&got){const all=[];Object.values(doms).forEach(ds=>ds.forEach(d=>all.push(d)));all.sort((a,b)=>b.w-a.w);const pick=[];for(const d of all){const lab=fRgb2lab(d.rgb[0],d.rgb[1],d.rgb[2]);if(pick.every(p=>fDE(lab,fRgb2lab(p[0],p[1],p[2]))>20))pick.push([Math.round(d.rgb[0]),Math.round(d.rgb[1]),Math.round(d.rgb[2])]);if(pick.length>=5)break;}fd.pal=pick;feedSave();}
  feedPalBar(fd,palBar,v);
  let sum=0,cnt=0;
  grid.querySelectorAll("[data-i]").forEach(t=>{const id=ord[+t.dataset.i];const sc=fScore(doms[id],fd.pal);const b=t.querySelector("[data-fb]");if(b){b.textContent=sc==null?"—":sc;b.style.color=fCol(sc);}if(sc!=null){sum+=sc;cnt++;}});
  const avg=cnt?Math.round(sum/cnt):null;
  if(avg==null){setOv("—","var(--muted)",0);if(ov&&ids.length&&!got)ov.title="Şəkillər oxunmadı — yuxarıdan «☁️ Drive-ı qoş» bas.";}
  else setOv(avg+"%",fCol(avg),avg);}
'''
repl_range("async function feedAnalyze(","function feedCoverPick(v,vid,lib,fd){",NEW_AN)

# (A) feedPick: foto qovluqları da görünsün
NEW_PICK=r'''function feedPick(v,lib,fd){
  const folders=smmLibrary(v).filter(m=>m.folder_id);
  const scrim=el("div","scrim");const body=el("div","mb");
  function addFile(f){const id=f.drive_id||f.id;if(!id)return;fd.extra=fd.extra||{};fd.extra[id]={drive_id:id,name:f.name||"Foto",kind:"foto",mime:"image/jpeg"};if(!fd.order.includes(id)&&fd.order.length<9)fd.order.push(id);feedSave();}
  function draw(){const inSet=new Set(fd.order);const avail=lib.filter(m=>!inSet.has(m.drive_id));
    if(fd.order.length>=9){body.innerHTML='<div class="hint" style="white-space:normal">9-luq feed doludur. Yeni material üçün əvvəlcə birini gridən çıxar (×).</div>';return;}
    if(!avail.length&&!folders.length){body.innerHTML='<div class="hint" style="white-space:normal">Bu məkanda material yoxdur. Çəkiliş videoları, foto qovluqları və dizaynlar «🗂 Materiallar» tabında görünür; əlavə fayl üçün ora «Yüklə» bas.</div>';return;}
    let html='<div class="hint" style="margin:0 0 8px">Foto 📷 · Video 🎬 · Dizayn 🎨 · Qovluq 📂 — klik ilə gridə əlavə et ('+fd.order.length+'/9)</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;max-height:56vh;overflow:auto">';
    html+=folders.map(m=>'<button type="button" data-ff="'+esc(m.key||m.folder_id)+'" title="'+esc(m.name)+'" style="padding:0;border:1px solid var(--border);border-radius:8px;overflow:hidden;cursor:pointer;background:var(--surface-2);aspect-ratio:3/4;position:relative;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:26px">📂<span style="position:absolute;left:0;right:0;bottom:0;font-size:9.5px;color:var(--ink);background:linear-gradient(transparent,rgba(0,0,0,.12));padding:8px 4px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(m.name)+'</span></button>').join("");
    html+=avail.map(m=>{const vid=String(m.mime).startsWith("video/");const ic=vid?"🎬":(m.kind==="dizayn"?"🎨":"📷");return '<button type="button" data-fp="'+esc(m.drive_id)+'" title="'+esc(m.name)+'" style="padding:0;border:1px solid var(--border);border-radius:8px;overflow:hidden;cursor:pointer;background:#1a1a1a;aspect-ratio:3/4;position:relative;display:block"><img src="'+fThumb(m.drive_id,200)+'" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.display=\'none\'"><span style="position:absolute;left:3px;top:3px;font-size:12px;filter:drop-shadow(0 1px 2px #000)">'+ic+'</span><span style="position:absolute;left:0;right:0;bottom:0;font-size:9.5px;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.8));padding:8px 4px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(m.name)+'</span></button>';}).join("");
    html+='</div>';body.innerHTML=html;
    body.querySelectorAll("[data-fp]").forEach(b=>b.onclick=()=>{if(fd.order.length>=9)return;fd.order.push(b.dataset.fp);feedSave();draw();});
    body.querySelectorAll("[data-ff]").forEach(b=>b.onclick=()=>{const fo=folders.find(x=>String(x.key||x.folder_id)===b.dataset.ff);if(fo)smmFolderPick(fo,(f)=>{addFile(f);draw();});});}
  scrim.innerHTML='<div class="modal" style="max-width:660px"><div class="mh"><h3>🗂 Materiallardan əlavə et</h3><button data-x>×</button></div></div>';
  scrim.querySelector(".modal").appendChild(body);
  document.body.appendChild(scrim);const close=()=>{scrim.remove();render();};scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  draw();}
'''
repl_range("function feedPick(v,lib,fd){","async function feedAnalyze(",NEW_PICK)

open(dst,"w").write(s)
print("ok bytes:",len(s))

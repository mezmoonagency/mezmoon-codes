# 08e -> 08f: planlayıcı tipli interfeys + video kadrından örtük (Drive ilə)
import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
assert s.count('APP_VERSION="2026.11.08e"')==1
s=s.replace('APP_VERSION="2026.11.08e"','APP_VERSION="2026.11.08f"')

def repl_range(start_pat,end_pat,new):
    global s
    a=s.find(start_pat); b=s.find(end_pat)
    assert a>0 and b>a,(start_pat[:40],a,b)
    s=s[:a]+new+s[b:]

# --- feedPlanBody (planlayıcı layout) + feedCoverSrc köməkçisi ---
NEW_PB=r'''function feedCoverSrc(id,fd){const c=fd.covers&&fd.covers[id];return c?(String(c).startsWith("data:")?c:fThumb(c,400)):fThumb(id,400);}
function feedTile(id,i,m,fd,v,lib){const t=el("div");t.draggable=true;t.dataset.i=i;
  t.style.cssText="position:relative;aspect-ratio:3/4;overflow:hidden;background:#1a1a1a;cursor:grab;border-radius:2px"+(fd.plan[id]?";outline:2px dashed rgba(255,255,255,.55);outline-offset:-3px":"");
  t.innerHTML='<img src="'+feedCoverSrc(id,fd)+'" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;display:block;pointer-events:none" onerror="this.style.visibility=\'hidden\'">'
    +'<span data-fb style="position:absolute;right:3px;top:3px;font-size:11px;font-weight:700;padding:1px 6px;border-radius:9px;background:rgba(0,0,0,.65);color:#999">…</span>'
    +feedBadge(m)
    +(String(m.mime).startsWith("video/")?'<button data-fcov title="Örtük kadrını seç" style="position:absolute;left:3px;top:24px;height:22px;padding:0 7px;border-radius:7px;background:rgba(0,0,0,.6);color:#fff;border:none;cursor:pointer;font-size:11px;line-height:22px">🖼 örtük</button>':'')
    +(fd.plan[id]?'<span style="position:absolute;left:4px;bottom:4px;font-size:9px;font-weight:700;letter-spacing:.5px;background:rgba(0,0,0,.6);color:#fff;padding:1px 5px;border-radius:6px">PLAN</span>':'')
    +'<button data-fdel title="Gridən çıxar" style="position:absolute;right:3px;bottom:3px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:none;cursor:pointer;font-size:13px;line-height:1">×</button>';
  t.ondragstart=()=>{fDrag=i;};t.ondragover=e=>e.preventDefault();
  t.ondrop=e=>{e.preventDefault();if(fDrag==null||fDrag===i)return;const it=fd.order.splice(fDrag,1)[0];fd.order.splice(i,0,it);feedSave();render();};
  t.onclick=e=>{if(e.target.closest("[data-fdel]")||e.target.closest("[data-fcov]"))return;fd.plan[id]=!fd.plan[id];feedSave();render();};
  t.querySelector("[data-fdel]").onclick=e=>{e.stopPropagation();fd.order.splice(fd.order.indexOf(id),1);delete fd.plan[id];feedSave();render();};
  const cb=t.querySelector("[data-fcov]");if(cb)cb.onclick=e=>{e.stopPropagation();feedCoverPick(v,id,lib,fd);};
  return t;}
function feedPlanBody(box,v,fd){
  const lib=smmLibrary(v).filter(m=>m.drive_id&&(String(m.mime).startsWith("image/")||String(m.mime).startsWith("video/")));
  const byId={};lib.forEach(m=>byId[m.drive_id]=m);fd.order=fd.order.filter(id=>byId[id]);
  if(!fd.covers)fd.covers={};
  const ord=fd.order.slice(0,9);
  const wrap=el("div");wrap.style.cssText="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start";
  const left=el("div");left.style.cssText="flex:0 0 auto;width:100%;max-width:380px";
  const grid=el("div");grid.style.cssText="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;background:#000;padding:3px;border-radius:12px";
  for(let i=0;i<9;i++){
    if(i<ord.length){grid.appendChild(feedTile(ord[i],i,byId[ord[i]],fd,v,lib));}
    else{const t=el("div");t.style.cssText="position:relative;aspect-ratio:3/4;border-radius:2px;background:var(--surface-2);border:1px dashed var(--border);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:24px;cursor:pointer";t.textContent="+";t.title="Material əlavə et";t.onclick=()=>feedPick(v,lib,fd);grid.appendChild(t);}
  }
  left.appendChild(grid);
  left.appendChild(el("div","hint","Hazır 9-luq feed (3×3). Sürüşdürüb yerini dəyiş · kliklə plan/paylaşılıb · 🖼 örtük (video) · × çıxar."));
  const side=el("div");side.style.cssText="flex:1;min-width:230px;max-width:340px;display:flex;flex-direction:column;gap:14px";
  const sc=el("div","panel");sc.style.cssText="padding:16px;text-align:center";
  sc.innerHTML='<div style="font-size:12.5px;color:var(--muted);margin-bottom:6px">Feed uyğunluğu</div><div data-fov style="font-size:40px;font-weight:700;line-height:1;color:var(--muted)">…</div><div style="font-size:12px;color:var(--muted);margin-top:6px">'+ord.length+'/9 post</div><div style="height:8px;background:var(--surface-2);border-radius:6px;margin-top:12px;overflow:hidden"><i data-fovbar style="display:block;height:100%;width:0;background:var(--muted);transition:width .4s"></i></div>';
  side.appendChild(sc);
  const pc=el("div","panel");pc.style.cssText="padding:14px 16px";pc.innerHTML='<div style="font-size:13px;font-weight:600;margin-bottom:10px">🎨 Brend palitrası</div>';
  const palBar=el("div");palBar.style.cssText="display:flex;align-items:center;gap:8px;flex-wrap:wrap";pc.appendChild(palBar);side.appendChild(pc);
  if(ord.length<9){const ab=el("button","btn","+ Material əlavə et");ab.style.width="100%";ab.onclick=()=>feedPick(v,lib,fd);side.appendChild(ab);}
  else side.appendChild(el("div","hint","9-luq feed doludur — yeni üçün birini × ilə çıxar."));
  side.appendChild(el("div","hint","Qeyd: feed düzülüşü, örtüklər və palitra hələ yalnız bu brauzerdə saxlanılır. Bütün komanda eyni görsün deyə bazaya sütun əlavə edə bilərik."));
  wrap.appendChild(left);wrap.appendChild(side);box.appendChild(wrap);
  setTimeout(()=>feedAnalyze(ord,fd,grid,sc.querySelector("[data-fov]"),palBar,sc.querySelector("[data-fovbar]")),30);}
'''
repl_range("function feedPlanBody(box,v,fd){","function feedPick(v,lib,fd){",NEW_PB)

# --- feedAnalyze (feedCoverSrc + nəticə zolağı) ---
NEW_AN=r'''async function feedAnalyze(ord,fd,grid,ov,palBar,ovbar){
  const ids=ord.slice();
  const setOv=(txt,col,pct)=>{if(ov){ov.textContent=txt;ov.style.color=col;}if(ovbar){ovbar.style.width=(pct||0)+"%";ovbar.style.background=col;}};
  if(!ids.length){setOv("—","var(--muted)",0);feedPalBar(fd,palBar);return;}
  const doms={};for(const id of ids){const im=await fLoad(feedCoverSrc(id,fd));if(im){const d=fDominants(im);if(d)doms[id]=d;}}
  const got=Object.keys(doms).length;
  if((!fd.pal||!fd.pal.length)&&got){const all=[];Object.values(doms).forEach(ds=>ds.forEach(d=>all.push(d)));all.sort((a,b)=>b.w-a.w);const pick=[];for(const d of all){const lab=fRgb2lab(d.rgb[0],d.rgb[1],d.rgb[2]);if(pick.every(p=>fDE(lab,fRgb2lab(p[0],p[1],p[2]))>20))pick.push([Math.round(d.rgb[0]),Math.round(d.rgb[1]),Math.round(d.rgb[2])]);if(pick.length>=5)break;}fd.pal=pick;feedSave();}
  feedPalBar(fd,palBar);
  let sum=0,cnt=0;
  grid.querySelectorAll("[data-i]").forEach(t=>{const id=ord[+t.dataset.i];const sc=fScore(doms[id],fd.pal);const b=t.querySelector("[data-fb]");if(b){b.textContent=sc==null?"—":sc;b.style.color=fCol(sc);}if(sc!=null){sum+=sc;cnt++;}});
  const avg=cnt?Math.round(sum/cnt):null;
  if(avg==null)setOv("—","var(--muted)",0);else setOv(avg+"%",fCol(avg),avg);}
'''
repl_range("async function feedAnalyze(","function feedCoverPick(v,vid,lib,fd){",NEW_AN)

# --- feedCoverPick (video kadrı + şəkil) ---
NEW_COVER=r'''function feedCoverPick(v,vid,lib,fd){
  const imgs=lib.filter(m=>String(m.mime).startsWith("image/"));
  const scrim=el("div","scrim");
  scrim.innerHTML='<div class="modal" style="max-width:520px"><div class="mh"><h3>🖼 Video örtüyü</h3><button data-x>×</button></div><div class="mb" id="cvbody"></div></div>';
  document.body.appendChild(scrim);const close=()=>scrim.remove();scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const body=scrim.querySelector("#cvbody");
  function setCover(val){if(val)fd.covers[vid]=val;else delete fd.covers[vid];feedSave();close();render();}
  function imgButtons(){return '<div class="hint" style="margin:10px 0 8px">Və ya hazır şəkildən örtük:</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px;max-height:36vh;overflow:auto"><button type="button" data-auto style="padding:0;border:1px solid var(--border);border-radius:8px;cursor:pointer;background:var(--surface-2);color:var(--muted);aspect-ratio:3/4;font-size:11px">Avto<br>kadr</button>'+imgs.map(m=>'<button type="button" data-cp="'+esc(m.drive_id)+'" title="'+esc(m.name)+'" style="padding:0;border:1px solid var(--border);border-radius:8px;overflow:hidden;cursor:pointer;background:#1a1a1a;aspect-ratio:3/4;display:block"><img src="'+fThumb(m.drive_id,160)+'" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.visibility=\'hidden\'"></button>').join("")+'</div>';}
  function wireImg(){const a=body.querySelector("[data-auto]");if(a)a.onclick=()=>setCover(null);body.querySelectorAll("[data-cp]").forEach(b=>b.onclick=()=>setCover(b.dataset.cp));}
  function start(){
    if(!driveConnected()){body.innerHTML='<div class="hint" style="white-space:normal">Video kadrını götürmək üçün yuxarıdan «☁️ Drive-ı qoş» bas. İndilik şəkildən örtük seçə bilərsən.</div>'+imgButtons();wireImg();return;}
    body.innerHTML='<div class="hint" style="white-space:normal">Videonu yüklə, sürgü ilə kadrı seç və «Bu kadrı götür» bas. Böyük videolarda yükləmə bir qədər çəkə bilər.</div><button class="btn" data-load style="width:100%;margin-top:4px">▶︎ Videonu yüklə və kadr seç</button>'+imgButtons();
    body.querySelector("[data-load]").onclick=loadVideo;wireImg();}
  async function loadVideo(){
    body.innerHTML='<div class="hint" id="cvp">Video yüklənir…</div>';
    try{
      const token=await gToken();
      const r=await fetch("https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(vid)+"?alt=media&supportsAllDrives=true",{headers:{Authorization:"Bearer "+token}});
      if(!r.ok)throw new Error("Video yüklənmədi ("+r.status+"). Şəkildən seç.");
      const url=URL.createObjectURL(await r.blob());
      body.innerHTML='<video id="cvv" src="'+url+'" preload="auto" muted playsinline style="width:100%;border-radius:10px;background:#000;max-height:50vh"></video><input id="cvs" type="range" min="0" max="1000" value="0" style="width:100%;margin-top:8px"><div style="display:flex;gap:8px;margin-top:8px"><button class="btn" data-cap style="flex:1">✓ Bu kadrı götür</button><button class="btn ghost" data-auto2>↺ Avto</button></div>';
      const vd=body.querySelector("#cvv"),sl=body.querySelector("#cvs");
      sl.oninput=()=>{if(vd.duration&&isFinite(vd.duration))vd.currentTime=vd.duration*(sl.value/1000);};
      body.querySelector("[data-auto2]").onclick=()=>setCover(null);
      body.querySelector("[data-cap]").onclick=()=>{
        const vw=vd.videoWidth,vh=vd.videoHeight;if(!vw){alert("Kadr hazır deyil, bir az gözlə.");return;}
        const c=document.createElement("canvas");c.width=360;c.height=480;const g=c.getContext("2d");
        const tr=360/480,sr=vw/vh;let sw,sh,sx,sy;
        if(sr>tr){sh=vh;sw=vh*tr;sx=(vw-sw)/2;sy=0;}else{sw=vw;sh=vw/tr;sx=0;sy=(vh-sh)/2;}
        g.drawImage(vd,sx,sy,sw,sh,0,0,360,480);
        try{setCover(c.toDataURL("image/jpeg",0.82));}catch(e){alert("Kadr götürülmədi: "+(e.message||e));}
      };
    }catch(e){body.innerHTML='<div class="empty" style="white-space:normal">'+esc(e.message||String(e))+'</div>'+imgButtons();wireImg();}
  }
  start();}
'''
repl_range("function feedCoverPick(v,vid,lib,fd){","function feedPalBar(fd,palBar){",NEW_COVER)

open(dst,"w").write(s)
print("ok bytes:",len(s))

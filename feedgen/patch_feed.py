import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
def r(a,b,n=1):
    global s
    c=s.count(a); assert c==n,(c,a[:90]); s=s.replace(a,b)

# 1) versiya 08a -> 08b
r('APP_VERSION="2026.11.08a"','APP_VERSION="2026.11.08b"')

# 2) SMM alt-tab: Feed (Story ilə Materiallar arasında)
r('[["plan","📅 Plan"],["story","◎ Story"],["media","🗂 Materiallar"]]',
  '[["plan","📅 Plan"],["story","◎ Story"],["feed","🎨 Feed"],["media","🗂 Materiallar"]]')

# 3) renderSmm dispatch: feed tabı
r('wrap.appendChild(smmTabs());if(smmTab==="media"){wrap.appendChild(smmMediaView(venues));return wrap;}',
  'wrap.appendChild(smmTabs());if(smmTab==="media"){wrap.appendChild(smmMediaView(venues));return wrap;}if(smmTab==="feed"){wrap.appendChild(smmFeedView(venues));return wrap;}')

# 4) Feed funksiyaları + rəng motoru — renderSmm-dən əvvəl
FEED = r'''/* ---------- Feed Generator (SMM alt-tab) — rəng tonuna uyğun feed önizləmə ---------- */
let FEEDS=null, fDrag=null;
function feedLoad(){if(FEEDS)return;try{FEEDS=JSON.parse(localStorage.getItem("mm_feed")||"{}");}catch(e){FEEDS={};}}
function feedOf(cl){feedLoad();return FEEDS[cl]||(FEEDS[cl]={order:[],plan:{},pal:[]});}
function feedSave(){try{localStorage.setItem("mm_feed",JSON.stringify(FEEDS));}catch(e){}}
function fRgb2lab(r,g,b){r/=255;g/=255;b/=255;r=r>.04045?Math.pow((r+.055)/1.055,2.4):r/12.92;g=g>.04045?Math.pow((g+.055)/1.055,2.4):g/12.92;b=b>.04045?Math.pow((b+.055)/1.055,2.4):b/12.92;let x=(r*.4124+g*.3576+b*.1805)/.95047,y=r*.2126+g*.7152+b*.0722,z=(r*.0193+g*.1192+b*.9505)/1.08883;const f=t=>t>.008856?Math.cbrt(t):7.787*t+16/116;x=f(x);y=f(y);z=f(z);return[116*y-16,500*(x-y),200*(y-z)];}
function fDE(a,b){return Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2);}
const FCV=document.createElement("canvas"),FCX=FCV.getContext("2d",{willReadFrequently:true});
function fDominants(img,n){n=n||4;const W=40,H=52;FCV.width=W;FCV.height=H;try{FCX.drawImage(img,0,0,W,H);var d=FCX.getImageData(0,0,W,H).data;}catch(e){return null;}const m={};for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2];const k=(r>>5)*1024+(g>>5)*32+(b>>5);(m[k]=m[k]||[0,0,0,0]);m[k][0]+=r;m[k][1]+=g;m[k][2]+=b;m[k][3]++;}const tot=W*H;return Object.values(m).map(v=>({rgb:[v[0]/v[3],v[1]/v[3],v[2]/v[3]],w:v[3]/tot})).sort((a,b)=>b.w-a.w).slice(0,n);}
function fScore(doms,pal){if(!pal||!pal.length||!doms||!doms.length)return null;let s=0,w=0;for(const d of doms){const lab=fRgb2lab(d.rgb[0],d.rgb[1],d.rgb[2]);let best=99;for(const p of pal)best=Math.min(best,fDE(lab,fRgb2lab(p[0],p[1],p[2])));s+=Math.max(0,100-best*2.6)*d.w;w+=d.w;}return Math.round(s/(w||1));}
function fThumb(id,w){return "https://drive.google.com/thumbnail?id="+id+"&sz=w"+(w||400);}
function fLoad(id){return new Promise(res=>{const im=new Image();im.crossOrigin="anonymous";im.referrerPolicy="no-referrer";im.onload=()=>res(im);im.onerror=()=>res(null);im.src=fThumb(id,400);});}
function fCol(s){return s==null?"var(--muted)":s>=80?"#34c38f":s>=60?"#f1b44c":"#f46a6a";}
function smmFeedView(venues){
  const box=el("div");
  if(!venues.length){box.appendChild(el("div","empty","Sənə hələ məkan təyin olunmayıb."));return box;}
  const v=venues.find(x=>x.client===smmVenue)||venues[0];
  const lib=smmLibrary(v).filter(m=>m.drive_id&&(String(m.mime).startsWith("image/")||String(m.mime).startsWith("video/")));
  const fd=feedOf(v.client);const byId={};lib.forEach(m=>byId[m.drive_id]=m);
  fd.order=fd.order.filter(id=>byId[id]);
  const bar=el("div");bar.style.cssText="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px";
  bar.innerHTML='<select data-fv style="font-size:13px;padding:8px 11px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--ink)">'+venues.map(x=>'<option value="'+esc(x.client)+'"'+(x.id===v.id?" selected":"")+'>'+esc(x.client)+'</option>').join("")+'</select>'
    +'<span style="font-size:12.5px;color:var(--muted)">feed uyğunluğu:</span><b data-fov style="font-size:18px;color:var(--muted)">…</b>'
    +'<button class="btn sm" data-fadd style="margin-left:auto">+ Material əlavə et</button>';
  bar.querySelector("[data-fv]").onchange=e=>{smmVenue=e.target.value;render();};
  box.appendChild(bar);
  const palBar=el("div");palBar.style.cssText="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px";box.appendChild(palBar);
  if(!fd.order.length)box.appendChild(el("div","empty","Feed boşdur. «+ Material əlavə et» ilə Drive materiallarından (foto və videolar) grid-ə əlavə et. Videodan avtomatik kadr götürülür, hər postun brend palitrasına rəng uyğunluğu hesablanır."));
  const grid=el("div");grid.style.cssText="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;background:#000;padding:3px;border-radius:10px;max-width:420px";
  fd.order.forEach((id,i)=>{const m=byId[id];const t=el("div");t.draggable=true;t.dataset.i=i;
    t.style.cssText="position:relative;aspect-ratio:3/4;overflow:hidden;background:#222;cursor:grab;border-radius:2px"+(fd.plan[id]?";outline:2px dashed rgba(255,255,255,.55);outline-offset:-3px":"");
    t.innerHTML='<img src="'+fThumb(id,400)+'" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;display:block;pointer-events:none">'
      +'<span data-fb style="position:absolute;right:3px;top:3px;font-size:11px;font-weight:700;padding:1px 6px;border-radius:9px;background:rgba(0,0,0,.65);color:#999">…</span>'
      +(String(m.mime).startsWith("video/")?'<span style="position:absolute;left:3px;top:3px;font-size:12px;filter:drop-shadow(0 1px 2px #000)">🎬</span>':'')
      +(fd.plan[id]?'<span style="position:absolute;left:4px;bottom:4px;font-size:9px;font-weight:700;letter-spacing:.5px;background:rgba(0,0,0,.6);color:#fff;padding:1px 5px;border-radius:6px">PLAN</span>':'')
      +'<button data-fdel title="Gridən çıxar" style="position:absolute;right:3px;bottom:3px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:none;cursor:pointer;font-size:13px;line-height:1">×</button>';
    t.ondragstart=()=>{fDrag=i;};t.ondragover=e=>e.preventDefault();
    t.ondrop=e=>{e.preventDefault();if(fDrag==null||fDrag===i)return;const it=fd.order.splice(fDrag,1)[0];fd.order.splice(i,0,it);feedSave();render();};
    t.onclick=e=>{if(e.target.closest("[data-fdel]"))return;fd.plan[id]=!fd.plan[id];feedSave();render();};
    t.querySelector("[data-fdel]").onclick=e=>{e.stopPropagation();fd.order.splice(i,1);delete fd.plan[id];feedSave();render();};
    grid.appendChild(t);});
  box.appendChild(grid);
  box.appendChild(el("div","hint","Kəsik xətt = planlanmış post · sürüşdürüb yerini dəyiş · kliklə plan/paylaşılıb · balın rəngi: yaşıl 80+, sarı 60–79, qırmızı <60."));
  box.appendChild(el("div","hint","Qeyd: feed düzülüşü və palitra hələ yalnız bu brauzerdə saxlanılır. Bütün komanda eyni görsün deyə bazaya sütun əlavə edə bilərik (istəsən)."));
  bar.querySelector("[data-fadd]").onclick=()=>feedPick(v,lib,fd);
  setTimeout(()=>feedAnalyze(fd,grid,bar,palBar),30);
  return box;}
function feedPick(v,lib,fd){const inSet=new Set(fd.order);const avail=lib.filter(m=>!inSet.has(m.drive_id));
  const scrim=el("div","scrim");
  scrim.innerHTML='<div class="modal" style="max-width:640px"><div class="mh"><h3>🗂 Materiallardan əlavə et</h3><button data-x>×</button></div><div class="mb">'+(avail.length?'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px;max-height:60vh;overflow:auto">'+avail.map(m=>'<button type="button" data-fp="'+esc(m.drive_id)+'" title="'+esc(m.name)+'" style="padding:0;border:1px solid var(--border);border-radius:8px;overflow:hidden;cursor:pointer;background:#222;aspect-ratio:3/4;position:relative"><img src="'+fThumb(m.drive_id,200)+'" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;display:block">'+(String(m.mime).startsWith("video/")?'<span style="position:absolute;left:3px;top:3px;font-size:11px">🎬</span>':'')+'</button>').join("")+'</div>':'<div class="hint" style="white-space:normal">Bu məkanda grid-ə əlavə oluna biləcək foto/video yoxdur. Çəkiliş videoları və dizaynlar «🗂 Materiallar» tabında görünür; əlavə fayl üçün ora «Yüklə» bas.</div>')+'</div></div>';
  document.body.appendChild(scrim);const close=()=>scrim.remove();scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  scrim.querySelectorAll("[data-fp]").forEach(b=>b.onclick=()=>{fd.order.push(b.dataset.fp);feedSave();close();render();});}
async function feedAnalyze(fd,grid,bar,palBar){
  const ids=fd.order.slice();const ov=bar.querySelector("[data-fov]");
  if(!ids.length){ov.textContent="—";ov.style.color="var(--muted)";feedPalBar(fd,palBar);return;}
  const doms={};for(const id of ids){const im=await fLoad(id);if(im){const d=fDominants(im);if(d)doms[id]=d;}}
  const got=Object.keys(doms).length;
  if((!fd.pal||!fd.pal.length)&&got){const all=[];Object.values(doms).forEach(ds=>ds.forEach(d=>all.push(d)));all.sort((a,b)=>b.w-a.w);const pick=[];for(const d of all){const lab=fRgb2lab(d.rgb[0],d.rgb[1],d.rgb[2]);if(pick.every(p=>fDE(lab,fRgb2lab(p[0],p[1],p[2]))>20))pick.push([Math.round(d.rgb[0]),Math.round(d.rgb[1]),Math.round(d.rgb[2])]);if(pick.length>=5)break;}fd.pal=pick;feedSave();}
  feedPalBar(fd,palBar);
  let sum=0,cnt=0;
  grid.querySelectorAll("[data-i]").forEach(t=>{const id=fd.order[+t.dataset.i];const sc=fScore(doms[id],fd.pal);const b=t.querySelector("[data-fb]");if(b){b.textContent=sc==null?"—":sc;b.style.color=fCol(sc);}if(sc!=null){sum+=sc;cnt++;}});
  const avg=cnt?Math.round(sum/cnt):null;ov.textContent=avg==null?(got?"—":"şəkil oxunmadı"):avg+"%";ov.style.color=fCol(avg);
  if(!got){ov.style.fontSize="12px";}}
function feedPalBar(fd,palBar){palBar.innerHTML="";const lab=el("span","hint","🎨 brend palitrası:");lab.style.cssText="margin:0 2px 0 0";palBar.appendChild(lab);
  (fd.pal||[]).forEach((c,i)=>{const sw=el("span");sw.title="klik: sil";sw.style.cssText="width:30px;height:30px;border-radius:7px;border:1px solid rgba(0,0,0,.3);cursor:pointer;background:rgb("+Math.round(c[0])+","+Math.round(c[1])+","+Math.round(c[2])+")";sw.onclick=()=>{fd.pal.splice(i,1);feedSave();render();};palBar.appendChild(sw);});
  if(!fd.pal||!fd.pal.length)palBar.appendChild(el("span","hint","— (şəkillərdən avtomatik çıxarılacaq)"));
  const re=el("button","btn ghost sm","↻ Şəkillərdən yenilə");re.style.marginLeft="4px";re.onclick=()=>{fd.pal=[];feedSave();render();};palBar.appendChild(re);}
'''
r('function renderSmm(){', FEED+'function renderSmm(){')

open(dst,"w").write(s)
print("ok, bytes:",len(s))

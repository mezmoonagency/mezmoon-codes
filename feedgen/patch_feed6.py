# 08f -> 09a: palitra hazırkı feeddən avtomatik + aydın palitra idarəsi
import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
assert s.count('APP_VERSION="2026.11.08f"')==1
s=s.replace('APP_VERSION="2026.11.08f"','APP_VERSION="2026.11.09a"')

def repl_range(a_pat,b_pat,new):
    global s
    a=s.find(a_pat);b=s.find(b_pat,a+5)
    assert a>0 and b>a,(a_pat[:40],a,b)
    s=s[:a]+new+s[b:]

# modul dəyişəni: FPALTRIED
assert s.count("const FEEDLIVE={};")==1
s=s.replace("const FEEDLIVE={};","const FEEDLIVE={},FPALTRIED={};")

# feedPlanBody: feedAnalyze-ə v ötür
old='setTimeout(()=>feedAnalyze(ord,fd,grid,sc.querySelector("[data-fov]"),palBar,sc.querySelector("[data-fovbar]")),30);'
assert s.count(old)==1
s=s.replace(old,'setTimeout(()=>feedAnalyze(ord,fd,grid,sc.querySelector("[data-fov]"),palBar,sc.querySelector("[data-fovbar]"),v),30);')

# feedAnalyze: palitra hazırkı feeddən avtomatik
NEW_AN=r'''async function feedAnalyze(ord,fd,grid,ov,palBar,ovbar,v){
  const ids=ord.slice();
  const setOv=(txt,col,pct)=>{if(ov){ov.textContent=txt;ov.style.color=col;}if(ovbar){ovbar.style.width=(pct||0)+"%";ovbar.style.background=col;}};
  // Palitra boşdursa: əvvəlcə məkanın HAZIRKI feed-indən rəngləri avtomatik götür
  if((!fd.pal||!fd.pal.length)&&v&&!FPALTRIED[v.client]){FPALTRIED[v.client]=1;try{const lp=await feedLivePalette(v);if(lp&&lp.length){fd.pal=lp;feedSave();}}catch(e){}}
  if(!ids.length){setOv("—","var(--muted)",0);feedPalBar(fd,palBar,v);return;}
  const doms={};for(const id of ids){const im=await fLoad(feedCoverSrc(id,fd));if(im){const d=fDominants(im);if(d)doms[id]=d;}}
  const got=Object.keys(doms).length;
  // Hələ palitra yoxdursa (hazırkı feed əlçatmazdır), planlanan şəkillərdən çıxart
  if((!fd.pal||!fd.pal.length)&&got){const all=[];Object.values(doms).forEach(ds=>ds.forEach(d=>all.push(d)));all.sort((a,b)=>b.w-a.w);const pick=[];for(const d of all){const lab=fRgb2lab(d.rgb[0],d.rgb[1],d.rgb[2]);if(pick.every(p=>fDE(lab,fRgb2lab(p[0],p[1],p[2]))>20))pick.push([Math.round(d.rgb[0]),Math.round(d.rgb[1]),Math.round(d.rgb[2])]);if(pick.length>=5)break;}fd.pal=pick;feedSave();}
  feedPalBar(fd,palBar,v);
  let sum=0,cnt=0;
  grid.querySelectorAll("[data-i]").forEach(t=>{const id=ord[+t.dataset.i];const sc=fScore(doms[id],fd.pal);const b=t.querySelector("[data-fb]");if(b){b.textContent=sc==null?"—":sc;b.style.color=fCol(sc);}if(sc!=null){sum+=sc;cnt++;}});
  const avg=cnt?Math.round(sum/cnt):null;
  if(avg==null)setOv("—","var(--muted)",0);else setOv(avg+"%",fCol(avg),avg);}
'''
repl_range("async function feedAnalyze(","function feedCoverPick(v,vid,lib,fd){",NEW_AN)

# feedPalBar: aydın idarə (＋ rəng, 📱 hazırkı feeddən, ↻ təmizlə)
NEW_PAL=r'''function feedPalBar(fd,palBar,v){palBar.innerHTML="";
  (fd.pal||[]).forEach((c,i)=>{const sw=el("span");sw.title="klik: sil";sw.style.cssText="width:30px;height:30px;border-radius:7px;border:1px solid rgba(0,0,0,.3);cursor:pointer;background:rgb("+Math.round(c[0])+","+Math.round(c[1])+","+Math.round(c[2])+")";sw.onclick=()=>{fd.pal.splice(i,1);feedSave();render();};palBar.appendChild(sw);});
  const add=el("label");add.title="Rəng əlavə et";add.style.cssText="position:relative;width:30px;height:30px;border-radius:7px;border:1px dashed var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--muted);font-size:18px";add.textContent="＋";
  const ci=el("input");ci.type="color";ci.value="#c79a6b";ci.style.cssText="position:absolute;inset:0;opacity:0;cursor:pointer";ci.onchange=()=>{const h=ci.value;fd.pal=fd.pal||[];fd.pal.push([parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]);feedSave();render();};add.appendChild(ci);palBar.appendChild(add);
  if(!fd.pal||!fd.pal.length)palBar.appendChild(el("span","hint","rənglər hazırkı feeddən avtomatik gəlir"));
  const row=el("div");row.style.cssText="flex-basis:100%;display:flex;gap:8px;flex-wrap:wrap;margin-top:8px";
  const b1=el("button","btn ghost sm","📱 Hazırkı feeddən götür");b1.onclick=async()=>{b1.textContent="Yüklənir…";b1.disabled=true;try{const lp=await feedLivePalette(v);if(lp&&lp.length){fd.pal=lp;feedSave();}else alert("Hazırkı feeddən rəng alınmadı — məkanın Instagram-ı qoşulu olmalıdır (📱 Hazırkı feed tabına bax).");}catch(e){alert("Alınmadı: "+(e&&e.message||e));}render();};row.appendChild(b1);
  const b2=el("button","btn ghost sm","↻ Təmizlə");b2.onclick=()=>{fd.pal=[];if(v)FPALTRIED[v.client]=1;feedSave();render();};row.appendChild(b2);
  palBar.appendChild(row);}
'''
repl_range("function feedPalBar(fd,palBar){","/* ---- Hazırkı feed",NEW_PAL)

# feedFetchLive + feedEnsureLive + feedLivePalette
NEW_LIVE=r'''async function feedEnsureLive(client){
  if(FEEDLIVE[client]&&FEEDLIVE[client]!=="loading")return FEEDLIVE[client];
  if(FEEDLIVE[client]==="loading"){for(let i=0;i<80&&FEEDLIVE[client]==="loading";i++)await new Promise(r=>setTimeout(r,200));return FEEDLIVE[client];}
  FEEDLIVE[client]="loading";
  try{const r=await fetch(SB_URL+"/functions/v1/ig-feed",{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+(session?session.access_token:"")},body:JSON.stringify({client})});
    const j=await r.json();FEEDLIVE[client]=j.ok?{media:j.media||[],username:j.username||""}:{err:j.error||"Feed oxunmadı."};}
  catch(e){FEEDLIVE[client]={err:"Feed oxunmadı: "+(e&&e.message||e)};}
  return FEEDLIVE[client];}
async function feedFetchLive(client){await feedEnsureLive(client);if(smmTab==="feed"&&feedMode==="live")render();}
async function feedLivePalette(v){
  const c=await feedEnsureLive(v.client);
  if(!c||!c.media||!c.media.length)return [];
  const all=[];for(const m of c.media.slice(0,12)){const im=await fLoad(m.thumb||m.url);if(im){const d=fDominants(im);if(d)d.forEach(x=>all.push(x));}}
  all.sort((a,b)=>b.w-a.w);const pick=[];for(const d of all){const lab=fRgb2lab(d.rgb[0],d.rgb[1],d.rgb[2]);if(pick.every(p=>fDE(lab,fRgb2lab(p[0],p[1],p[2]))>18))pick.push([Math.round(d.rgb[0]),Math.round(d.rgb[1]),Math.round(d.rgb[2])]);if(pick.length>=5)break;}
  return pick;}
'''
repl_range("async function feedFetchLive(","async function feedLiveAnalyze(",NEW_LIVE)

open(dst,"w").write(s)
print("ok bytes:",len(s))

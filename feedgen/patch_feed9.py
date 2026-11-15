# 09e -> 09f: Hazırkı feed-də Apify ilə ƏSL örtüklər (ig-grid), 24 saat keş
import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
assert s.count('APP_VERSION="2026.11.09e"')==1
s=s.replace('APP_VERSION="2026.11.09e"','APP_VERSION="2026.11.09f"')

# modul cache
assert s.count("const FEEDLIVE={},FPALTRIED={};")==1
s=s.replace("const FEEDLIVE={},FPALTRIED={};","const FEEDLIVE={},FPALTRIED={},FEEDGRID={};")

# helpers + feedLiveCoverSrc (Apify örtüyünü nəzərə alır)
old='function feedLiveCoverSrc(m,fd){const c=fd.covers&&fd.covers[m.id];return c?(String(c).startsWith("data:")?c:fThumb(c,400)):(m.thumb||m.url);}'
assert s.count(old)==1
new=r'''function feedShort(p){const m=String(p||"").match(/\/(?:reel|reels|p|tv)\/([^/?#]+)/i);return m?m[1]:"";}
function feedGridStore(){try{return JSON.parse(localStorage.getItem("mm_feedgrid")||"{}");}catch(e){return {};}}
function feedGridCache(client){const s=feedGridStore()[client];return s&&(Date.now()-s.ts<864e5)?s.map:null;}
function feedGridCents(client){const s=feedGridStore()[client];return s?(s.cents||0):0;}
function feedGridSave(client,map,cents){const s=feedGridStore();s[client]={ts:Date.now(),map,cents:cents||0};try{localStorage.setItem("mm_feedgrid",JSON.stringify(s));}catch(e){}}
async function feedFetchGrid(client,force){
  try{
    if(!force){const c=feedGridCache(client);if(c){Object.assign(FEEDGRID,c);return {ok:true,cached:true,cents:feedGridCents(client)};}}
    const {data:{session}}=await sb.auth.getSession();
    const r=await fetch(SB_URL+"/functions/v1/ig-grid",{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+(session?session.access_token:"")},body:JSON.stringify({client})});
    const j=await r.json();
    if(!j.ok)return {ok:false,error:j.error||"Alınmadı"};
    const map={};(j.media||[]).forEach(x=>{if(x.shortcode&&x.cover)map[x.shortcode]=x.cover;});
    const cents=Number(j.cents||0);
    Object.assign(FEEDGRID,map);feedGridSave(client,map,cents);
    return {ok:true,count:Object.keys(map).length,cents};
  }catch(e){return {ok:false,error:"Alınmadı: "+(e&&e.message||e)};}}
function feedLiveCoverSrc(m,fd){const c=fd.covers&&fd.covers[m.id];if(c)return String(c).startsWith("data:")?c:fThumb(c,400);const sc=feedShort(m.permalink);if(sc&&FEEDGRID[sc])return FEEDGRID[sc];return m.thumb||m.url;}'''
s=s.replace(old,new)

# bar innerHTML: "🖼 Əsl örtüklər" düyməsi (yalnız icazəli rol)
oldbar='bar.innerHTML=\'<span style="font-size:12.5px;color:var(--muted)">feed uyğunluğu:</span><b data-fov style="font-size:18px;color:var(--muted)">\'+(cache&&cache.media?"…":"—")+\'</b><button class="btn ghost sm" data-frel style="margin-left:auto">↻ Yenilə</button>\';'
assert s.count(oldbar)==1
newbar=('bar.innerHTML=\'<span style="font-size:12.5px;color:var(--muted)">feed uyğunluğu:</span><b data-fov style="font-size:18px;color:var(--muted)">\'+(cache&&cache.media?"…":"—")+\'</b>\''
        '+(smmMediaCanAdd()?\'<button class="btn ghost sm" data-fgrid title="Instagram-dakı əsl örtükləri Apify ilə yüklə" style="margin-left:auto">🖼 Əsl örtüklər</button><button class="btn ghost sm" data-frel>↻ Yenilə</button>\':\'<button class="btn ghost sm" data-frel style="margin-left:auto">↻ Yenilə</button>\');')
s=s.replace(oldbar,newbar)

# data-fgrid wiring + keşdən əsl örtükləri tətbiq et (data-frel wiring-dən sonra)
oldw='bar.querySelector("[data-frel]").onclick=()=>{delete FEEDLIVE[v.client];render();};'
assert s.count(oldw)==1
neww=(oldw+
      '{const gb=bar.querySelector("[data-fgrid]");if(gb)gb.onclick=async()=>{gb.textContent="Yüklənir…";gb.disabled=true;const res=await feedFetchGrid(v.client,true);if(!res.ok)alert(res.error||"Alınmadı");render();};}'
      '{const gc=feedGridCache(v.client);if(gc)Object.assign(FEEDGRID,gc);}')
s=s.replace(oldw,neww)

# Grid izahının altında Apify xərc sətri
oldhint='box.appendChild(el("div","hint","Məkanın hazırkı Instagram feed-i (son postlar). Video örtüyü API-dən ilk kadr kimi gəlir — «🖼 örtük» ilə düzgün şəkli təyin et. Posta klik — Instagram-da açılır."));'
assert s.count(oldhint)==1
newhint=oldhint+'if(feedGridCents(v.client))box.appendChild(el("div","hint","🖼 Əsl örtüklər Apify-dan yükləndi · son sorğu ≈ "+feedGridCents(v.client).toFixed(2)+" sent · 24 saat keşlənir, təkrar sorğu pul tutur."));'
s=s.replace(oldhint,newhint)

open(dst,"w").write(s)
print("ok bytes:",len(s))

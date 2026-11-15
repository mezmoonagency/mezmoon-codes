# 09d -> 09e: Hazırkı feed-də video örtüyünü əl ilə düzəlt (IG API əsl örtüyü vermir)
import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
assert s.count('APP_VERSION="2026.11.09d"')==1
s=s.replace('APP_VERSION="2026.11.09d"','APP_VERSION="2026.11.09e"')

def repl_range(a_pat,b_pat,new):
    global s
    a=s.find(a_pat);b=s.find(b_pat,a+5)
    assert a>0 and b>a,(a_pat[:40],a,b)
    s=s[:a]+new+s[b:]

NEW=r'''function feedLiveCoverSrc(m,fd){const c=fd.covers&&fd.covers[m.id];return c?(String(c).startsWith("data:")?c:fThumb(c,400)):(m.thumb||m.url);}
function feedLiveCoverPick(v,mid,fd){
  const imgs=smmLibrary(v).filter(m=>m.drive_id&&String(m.mime).startsWith("image/"));
  const scrim=el("div","scrim");
  const tiles='<button type="button" data-cauto title="Instagram API kadrı" style="padding:0;border:1px solid var(--border);border-radius:8px;cursor:pointer;background:var(--surface-2);color:var(--muted);aspect-ratio:3/4;font-size:11px">Avto<br>(API)</button>'+imgs.map(m=>'<button type="button" data-cp="'+esc(m.drive_id)+'" title="'+esc(m.name)+'" style="padding:0;border:1px solid var(--border);border-radius:8px;overflow:hidden;cursor:pointer;background:#1a1a1a;aspect-ratio:3/4;display:block"><img src="'+fThumb(m.drive_id,160)+'" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.visibility=\'hidden\'"></button>').join("");
  scrim.innerHTML='<div class="modal" style="max-width:560px"><div class="mh"><h3>🖼 Hazırkı feed — video örtüyü</h3><button data-x>×</button></div><div class="mb"><div class="hint" style="white-space:normal;margin:0 0 8px">Instagram API videonun əsl profil örtüyünü vermir (ilk kadrı qaytarır). Önizləmə profildəki kimi görünsün deyə, düzgün örtük şəklini materiallardan seç.</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px;max-height:46vh;overflow:auto">'+tiles+'</div></div></div>';
  document.body.appendChild(scrim);const close=()=>scrim.remove();scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  function setC(val){if(val)fd.covers[mid]=val;else delete fd.covers[mid];feedSave();close();render();}
  scrim.querySelector("[data-cauto]").onclick=()=>setC(null);
  scrim.querySelectorAll("[data-cp]").forEach(b=>b.onclick=()=>setC(b.dataset.cp));}
function feedLiveBody(box,v,acc,fd){
  if(!acc){box.appendChild(el("div","empty","Bu məkanın Instagram-ı panelə qoşulmayıb. «🗂 Materiallar» tabında «📷 Avto-paylaşım üçün qoş» ilə hesabı qoş, sonra hazırkı feed burada görünəcək."));return;}
  const cache=FEEDLIVE[v.client];
  const bar=el("div");bar.style.cssText="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px";
  bar.innerHTML='<span style="font-size:12.5px;color:var(--muted)">feed uyğunluğu:</span><b data-fov style="font-size:18px;color:var(--muted)">'+(cache&&cache.media?"…":"—")+'</b><button class="btn ghost sm" data-frel style="margin-left:auto">↻ Yenilə</button>';
  box.appendChild(bar);
  bar.querySelector("[data-frel]").onclick=()=>{delete FEEDLIVE[v.client];render();};
  if(!cache){box.appendChild(el("div","hint","Instagram-dan yüklənir…"));feedFetchLive(v.client);return;}
  if(cache==="loading"){box.appendChild(el("div","hint","Instagram-dan yüklənir…"));return;}
  if(cache.err){const eb=el("div");eb.style.cssText="display:flex;flex-direction:column;gap:10px;align-items:flex-start";eb.appendChild(el("div","empty",cache.err));const _cl=smmIgOf(v.client).client;if(_cl&&smmMediaCanAdd()){const rb=el("button","btn sm","🔄 Hesabı yenidən qoş");rb.onclick=()=>{delete FEEDLIVE[v.client];smmIgConnect(_cl.id,rb);};eb.appendChild(rb);}box.appendChild(eb);return;}
  const media=cache.media||[];
  if(!media.length){box.appendChild(el("div","empty","Bu hesabda post tapılmadı."));return;}
  const grid=el("div");grid.style.cssText="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;background:#000;padding:3px;border-radius:10px;max-width:420px";
  media.forEach((m,i)=>{const t=el("div");t.dataset.i=i;const isV=m.type==="VIDEO";t.style.cssText="position:relative;aspect-ratio:3/4;overflow:hidden;background:#222;cursor:pointer;border-radius:2px";
    t.innerHTML='<img src="'+esc(feedLiveCoverSrc(m,fd))+'" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;display:block;pointer-events:none">'
      +'<span data-fb style="position:absolute;right:3px;top:3px;font-size:11px;font-weight:700;padding:1px 6px;border-radius:9px;background:rgba(0,0,0,.65);color:#999">…</span>'
      +(isV?'<span style="position:absolute;left:3px;top:3px;font-size:12px;filter:drop-shadow(0 1px 2px #000)">🎬</span>':(m.type==="CAROUSEL_ALBUM"?'<span style="position:absolute;left:3px;top:3px;font-size:12px;filter:drop-shadow(0 1px 2px #000)">🖼</span>':''))
      +(isV&&smmMediaCanAdd()?'<button data-lcov title="Örtük şəklini düzəlt" style="position:absolute;left:3px;top:24px;height:22px;padding:0 7px;border-radius:7px;background:rgba(0,0,0,.6);color:#fff;border:none;cursor:pointer;font-size:11px;line-height:22px">🖼 örtük</button>':'');
    const cb=t.querySelector("[data-lcov]");if(cb)cb.onclick=e=>{e.stopPropagation();feedLiveCoverPick(v,m.id,fd);};
    if(m.permalink)t.onclick=e=>{if(e.target.closest("[data-lcov]"))return;window.open(m.permalink,"_blank","noopener");};
    grid.appendChild(t);});
  box.appendChild(grid);
  box.appendChild(el("div","hint","Məkanın hazırkı Instagram feed-i (son postlar). Video örtüyü API-dən ilk kadr kimi gəlir — «🖼 örtük» ilə düzgün şəkli təyin et. Posta klik — Instagram-da açılır."));
  setTimeout(()=>feedLiveAnalyze(v,fd,media,grid,bar.querySelector("[data-fov]")),30);}
'''
repl_range("function feedLiveBody(box,v,acc,fd){","async function feedEnsureLive(",NEW)

# feedLiveAnalyze: örtüyü nəzərə al
old='const im=await fLoad(media[i].thumb||media[i].url);'
assert s.count(old)==1
s=s.replace(old,'const im=await fLoad(feedLiveCoverSrc(media[i],fd));')

open(dst,"w").write(s)
print("ok bytes:",len(s))

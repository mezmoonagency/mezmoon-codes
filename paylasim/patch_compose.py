import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src,encoding="utf-8").read()
def rep(a,b,n=1,where=None):
    global s
    t=s if where is None else where
    assert t.count(a)==n,(t.count(a),a[:80])
    return t.replace(a,b)
s=rep('APP_VERSION="2026.11.06a"','APP_VERSION="2026.11.06b"')
i=s.index("function openSmmForm(edit,day){");j=s.index("function openSmmVenues(){")
F=s[i:j]
F=rep('scrim.innerHTML=`<div class="modal"><div class="mh"><h3>${isEdit?"Paylaşımı düzəlt":"Yeni paylaşım"}</h3><button data-x>×</button></div><div class="mb">',
      'scrim.innerHTML=`<div class="modal smc"><div class="mh"><h3>${isEdit?"Paylaşımı düzəlt":"Yeni paylaşım"}</h3><button data-x>×</button></div><div class="mb"><div class="smc-grid"><div class="smc-left">',where=F)
F=rep('''  </div><div class="mf"><button class="btn ghost" data-x2>Ləğv</button><button class="btn" data-ok>${isEdit?"Yadda saxla":"Əlavə et"}</button></div></div>`;''',
'''  </div><div class="smc-right">
    <div class="smc-head"><span>Önizləmə</span><div class="seg" id="smc-tabs"></div></div>
    <div id="smc-phone"></div>
    <div class="smc-set" id="smc-tt">
      <div class="smc-set-h">TikTok ayarları</div>
      <label class="smc-row"><span>Kim baxa bilər</span><select id="tt-priv"><option value="PUBLIC_TO_EVERYONE">Hamı</option><option value="MUTUAL_FOLLOW_FRIENDS">Dostlar</option><option value="SELF_ONLY">Yalnız mən</option></select></label>
      <label class="smc-row"><span>Şərhlər</span><input type="checkbox" id="tt-com"></label>
      <label class="smc-row" data-ttv><span>Duet</span><input type="checkbox" id="tt-duet"></label>
      <label class="smc-row" data-ttv><span>Stitch</span><input type="checkbox" id="tt-stitch"></label>
      <label class="smc-row"><span>«AI ilə yaradılıb» işarəsi</span><input type="checkbox" id="tt-ai"></label>
      <div class="hint" style="white-space:normal">Ayarlar TikTok API qoşulanda avtomatik paylaşımda tətbiq olunacaq.</div>
    </div>
  </div></div></div><div class="mf"><button class="btn ghost" data-x2>Ləğv</button><button class="btn" data-ok>${isEdit?"Yadda saxla":"Əlavə et"}</button></div></div>`;''',where=F)
# preview logic
F=rep('''  drawPlat();
  q("#s-ai").onclick=''','''  const ttO=Object.assign({privacy:"PUBLIC_TO_EVERYONE",comment:true,duet:true,stitch:true,ai:false},(e.tt_opts&&typeof e.tt_opts==="object")?e.tt_opts:{});
  q("#tt-priv").value=ttO.privacy;q("#tt-com").checked=!!ttO.comment;q("#tt-duet").checked=!!ttO.duet;q("#tt-stitch").checked=!!ttO.stitch;q("#tt-ai").checked=!!ttO.ai;
  let pvTab=plats.has("instagram")?"instagram":"tiktok";
  const mediaThumb=()=>{const m=curM();const id=m?m.drive_id:driveId(q("#s5").value||"");return id?"https://drive.google.com/thumbnail?id="+encodeURIComponent(id)+"&sz=w800":"";};
  const handleOf=(v,p)=>{const raw=v?(p==="tiktok"?(v.tt_link||""):(v.ig_link||"")):"";const h=String(raw).trim().replace(/^https?:\\/\\/(www\\.)?(instagram|tiktok)\\.com\\/@?/i,"").replace(/\\/.*$/,"").replace(/^@/,"");return h||(v?v.client.toLocaleLowerCase("az").replace(/\\s+/g,""):"mekan");};
  const drawPreview=()=>{if(!plats.has(pvTab))pvTab=plats.has("instagram")?"instagram":"tiktok";
    q("#smc-tabs").innerHTML=[...plats].sort().map(p=>`<button type="button" data-pv="${p}" class="${p===pvTab?"on":""}">${p==="tiktok"?"TikTok":"Instagram"}</button>`).join("");
    q("#smc-tabs").querySelectorAll("[data-pv]").forEach(b=>b.onclick=()=>{pvTab=b.dataset.pv;drawPreview();});
    const v=curV(),img=mediaThumb(),isVid=kinds.has("video")&&!kinds.has("foto"),h=esc(handleOf(v,pvTab));
    const media=img?`<img src="${esc(img)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'smc-noimg',textContent:'Önizləmə açılmadı'}))">`:`<div class="smc-noimg">Material seçilməyib</div>`;
    if(pvTab==="tiktok"){const cap=q("#s9").value.trim();
      q("#smc-phone").innerHTML=`<div class="smc-tt">${media}<div class="smc-tt-side"><i>♥</i><i>💬</i><i>↗</i></div><div class="smc-tt-cap"><b>@${h}</b>${cap?`<p>${esc(cap)}</p>`:`<p class="smc-empty">TikTok mətni burada görünəcək</p>`}</div></div>`;}
    else{const cap=q("#s7").value.trim();
      q("#smc-phone").innerHTML=`<div class="smc-ig"><div class="smc-ig-top"><span class="smc-av">${h.slice(0,1).toUpperCase()}</span><b>${h}</b></div><div class="smc-ig-media${isVid?" vid":""}">${media}</div><div class="smc-ig-act">♡ &nbsp;💬 &nbsp;➤</div><div class="smc-ig-cap">${cap?`<b>${h}</b> ${esc(cap)}`:`<span class="smc-empty">Instagram mətni burada görünəcək</span>`}</div></div>`;}
    q("#smc-tt").style.display=plats.has("tiktok")?"":"none";
    scrim.querySelectorAll("[data-ttv]").forEach(x=>x.style.display=kinds.has("video")?"":"none");};
  ["#s7","#s9","#s5"].forEach(id=>q(id).addEventListener("input",drawPreview));
  q("#s-ai").onclick=''',where=F)
F=rep('''    scrim.querySelectorAll("[data-pf]").forEach(x=>x.style.display=plats.has(x.dataset.pf)?"":"none");};''','''    scrim.querySelectorAll("[data-pf]").forEach(x=>x.style.display=plats.has(x.dataset.pf)?"":"none");if(typeof drawPreview==="function")drawPreview();};''',where=F)
# drawPub -> preview
F=rep('''    q("#s-pm").textContent=(pubMode==="auto"''','''    if(typeof drawPreview==="function")drawPreview();
    q("#s-pm").textContent=(pubMode==="auto"''',where=F)
# AI: send drive id, show what it saw
F=rep('''body:JSON.stringify({client,kinds:[...kinds],note:q("#s4").value.trim(),platforms:[...plats]})''','''body:JSON.stringify({client,kinds:[...kinds],note:q("#s4").value.trim(),platforms:[...plats],drive_id:(curM()&&curM().drive_id)||driveId(q("#s5").value||"")||""})''',where=F)
F=rep('''h.textContent="Hazırdır. Yoxla və lazım olsa düzəlt."+(j.cost_usd!=null?" Xərc: $"+j.cost_usd:"");}}''','''h.textContent=(j.seen?"AI materialda gördü: "+j.seen+". ":j.image===false?"Material oxunmadı, mətn yalnız mövzuya görə yazıldı. ":"")+"Yoxla və lazım olsa düzəlt."+(j.cost_usd!=null?" Xərc: $"+j.cost_usd:"");drawPreview();}}''',where=F)
F=rep('''if(!q("#s4").value.trim()&&!confirm("Mövzu yazılmayıb. Mətn ümumi olacaq. Davam edilsin?"))return;''','''if(!q("#s4").value.trim()&&!curM()&&!driveId(q("#s5").value||"")&&!confirm("Nə mövzu, nə material var. Mətn ümumi olacaq. Davam edilsin?"))return;''',where=F)
F=rep('''platforms:[...plats],publish_mode:pubMode,''','''platforms:[...plats],tt_opts:plats.has("tiktok")?{privacy:q("#tt-priv").value,comment:q("#tt-com").checked,duet:q("#tt-duet").checked,stitch:q("#tt-stitch").checked,ai:q("#tt-ai").checked}:{},publish_mode:pubMode,''',where=F)
F=rep('''<div class="hint" id="s-aih" style="white-space:normal;margin-bottom:6px">Mövzunu yuxarıda yaz, AI hər platforma üçün ayrıca mətn hazırlasın. Sonra istədiyin kimi düzəlt.</div>''','''<div class="hint" id="s-aih" style="white-space:normal;margin-bottom:6px">Materialı seç və ya mövzunu yaz: AI materiala baxıb hər platforma üçün ayrıca mətn hazırlayır. Sonra istədiyin kimi düzəlt.</div>''',where=F)
F=rep("""  drawPub();
  q("[data-ok]").onclick=""","""  drawPlat();drawPub();
  q("[data-ok]").onclick=""",where=F)
s=s[:i]+F+s[j:]
css='''
/* Paylaşım: önizləmə ilə forma */
.modal.smc{max-width:1000px;width:96vw}
.smc-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,.85fr);gap:22px;align-items:start}
.smc-left{display:flex;flex-direction:column;gap:12px;min-width:0}
.smc-right{position:sticky;top:0;display:flex;flex-direction:column;gap:12px}
.smc-head{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:var(--muted)}
.smc-ig,.smc-tt{border-radius:16px;overflow:hidden;border:1px solid var(--border);background:var(--surface);box-shadow:var(--shadow)}
.smc-ig-top{display:flex;align-items:center;gap:8px;padding:10px 12px;font-size:13px}
.smc-av{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:#fff;font-weight:700;font-size:12px}
.smc-ig-media{aspect-ratio:4/5;background:#111;display:grid}
.smc-ig-media.vid{aspect-ratio:9/16;max-height:420px}
.smc-ig-media img,.smc-tt img{width:100%;height:100%;object-fit:cover;display:block}
.smc-noimg{display:grid;place-items:center;color:#9a9ab0;font-size:12.5px;width:100%;height:100%;min-height:180px}
.smc-ig-act{padding:8px 12px 2px;font-size:16px;color:var(--ink)}
.smc-ig-cap{padding:4px 12px 12px;font-size:13px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;max-height:180px;overflow:auto;color:var(--ink)}
.smc-tt{position:relative;aspect-ratio:9/16;max-height:520px;background:#000;display:grid}
.smc-tt-side{position:absolute;right:10px;bottom:90px;display:flex;flex-direction:column;gap:14px;color:#fff;font-size:20px;font-style:normal;text-shadow:0 1px 3px rgba(0,0,0,.6)}
.smc-tt-side i{font-style:normal}
.smc-tt-cap{position:absolute;left:0;right:52px;bottom:0;padding:14px 12px;color:#fff;font-size:13px;line-height:1.4;background:linear-gradient(transparent,rgba(0,0,0,.7))}
.smc-tt-cap p{margin:4px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.smc-empty{color:var(--muted);font-style:italic}
.smc-tt-cap .smc-empty{color:#cfcfe0}
.smc-set{border:1px solid var(--border);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;background:var(--surface-2)}
.smc-set-h{font-size:12.5px;font-weight:700}
.smc-row{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px;cursor:pointer}
.smc-row select{font-size:12.5px;padding:5px 8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--ink)}
@media (max-width:860px){.smc-grid{grid-template-columns:1fr}.smc-right{position:static}}
'''
k=s.index('</style>');s=s[:k]+css+s[k:]
open(dst,"w",encoding="utf-8").write(s);print("ok")

import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src,encoding="utf-8").read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(s.count(a),a[:80])
    s=s.replace(a,b)
rep('APP_VERSION="2026.11.05d"','APP_VERSION="2026.11.06a"')
# venue manager: TikTok column
G="minmax(120px,1.3fr) minmax(130px,1.2fr) minmax(120px,1.3fr) 100px 100px 132px 30px"
rep(G,"minmax(120px,1.3fr) minmax(130px,1.2fr) minmax(110px,1.1fr) minmax(110px,1.1fr) 100px 100px 132px 30px",2)
rep('<span>Məkan</span><span>Account Manager</span><span>Instagram</span>','<span>Məkan</span><span>Account Manager</span><span>Instagram</span><span>TikTok</span>')
rep('''        <input data-k="ig_link" value="${esc(v?v.ig_link:"")}" placeholder="@hesab" style="${inp}">''','''        <input data-k="ig_link" value="${esc(v?v.ig_link:"")}" placeholder="@hesab" style="${inp}">
        <input data-k="tt_link" value="${esc(v?(v.tt_link||""):"")}" placeholder="@tiktok" style="${inp}">''')
# form: platforms
rep('''    <div class="field"><label>Tarix və saat</label><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input id="s2"''','''    <div class="field"><label>Platformalar</label><div class="pchips" style="max-height:none"><button type="button" class="pchip" data-plat="instagram">Instagram</button><button type="button" class="pchip" data-plat="tiktok">TikTok</button></div></div>
    <div class="field"><label>Tarix və saat</label><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input id="s2"''')
rep('''    <div class="field"><label>Instagram mətni (caption)</label><textarea id="s7" rows="3" maxlength="2200" placeholder="Paylaşımın altında gedəcək mətn">${esc(e.caption||"")}</textarea></div>''','''    <div class="field"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><label style="margin:0">Paylaşım mətni</label><button type="button" class="mini" id="s-ai" style="margin-left:auto">✨ AI ilə yaz</button></div>
      <div class="hint" id="s-aih" style="white-space:normal;margin-bottom:6px">Mövzunu yuxarıda yaz, AI hər platforma üçün ayrıca mətn hazırlasın. Sonra istədiyin kimi düzəlt.</div>
      <div data-pf="instagram"><div class="hint" style="margin-bottom:4px">Instagram</div><textarea id="s7" rows="4" maxlength="2200" placeholder="Instagram paylaşımının mətni">${esc(e.caption||"")}</textarea></div>
      <div data-pf="tiktok" style="margin-top:10px"><div class="hint" style="margin-bottom:4px">TikTok</div><textarea id="s9" rows="3" maxlength="2200" placeholder="TikTok paylaşımının mətni">${esc(e.caption_tt||"")}</textarea></div></div>''')
rep('''  let mediaId=e.media_id||null,pubMode=e.publish_mode||"manual";''','''  let mediaId=e.media_id||null,pubMode=e.publish_mode||"manual";
  const plats=new Set(Array.isArray(e.platforms)&&e.platforms.length?e.platforms:["instagram"]);
  const drawPlat=()=>{scrim.querySelectorAll("[data-plat]").forEach(x=>x.classList.toggle("on",plats.has(x.dataset.plat)));
    scrim.querySelectorAll("[data-pf]").forEach(x=>x.style.display=plats.has(x.dataset.pf)?"":"none");};
  scrim.querySelectorAll("[data-plat]").forEach(b=>b.onclick=()=>{const k=b.dataset.plat;if(plats.has(k)){if(plats.size>1)plats.delete(k);}else plats.add(k);drawPlat();drawPub();});
  drawPlat();
  q("#s-ai").onclick=async()=>{const b=q("#s-ai"),h=q("#s-aih");const v=curV();const sv=q("#s1").value;const client=v?v.client:(sv.startsWith("c:")?sv.slice(2):"");
    if(!client){h.textContent="Əvvəl məkanı seç.";return;}
    if(!q("#s4").value.trim()&&!confirm("Mövzu yazılmayıb. Mətn ümumi olacaq. Davam edilsin?"))return;
    b.disabled=true;b.textContent="Yazılır…";h.textContent="AI mətn hazırlayır, bir neçə saniyə çəkə bilər.";
    try{const {data:{session}}=await sb.auth.getSession();
      const r=await fetch(SB_URL+"/functions/v1/smm-caption",{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+(session?session.access_token:"")},body:JSON.stringify({client,kinds:[...kinds],note:q("#s4").value.trim(),platforms:[...plats]})});
      const j=await r.json().catch(()=>({ok:false,error:"cavab oxunmadı ("+r.status+")"}));
      if(!j.ok){h.textContent="Alınmadı: "+(j.error||"naməlum xəta");}
      else{if(j.instagram&&plats.has("instagram"))q("#s7").value=j.instagram;if(j.tiktok&&plats.has("tiktok"))q("#s9").value=j.tiktok;h.textContent="Hazırdır. Yoxla və lazım olsa düzəlt."+(j.cost_usd!=null?" Xərc: $"+j.cost_usd:"");}}
    catch(err){h.textContent="Alınmadı: "+(err.message||err);}
    b.disabled=false;b.textContent="✨ AI ilə yaz";};''')
rep('''    q("#s-pm").textContent=pubMode==="auto"?(smmAutoProblem(curM(),v)||"Vaxtı gələndə Instagram-a özü gedəcək."):pubMode==="remind"?"Vaxtı gələndə fayl linki və mətn Account-a bildiriş kimi gedəcək.":"";};''','''    q("#s-pm").textContent=(pubMode==="auto"?(smmAutoProblem(curM(),v)||"Vaxtı gələndə Instagram-a özü gedəcək."):pubMode==="remind"?"Vaxtı gələndə fayl linki və mətn Account-a bildiriş kimi gedəcək.":"")+(plats.has("tiktok")?(pubMode==="manual"?"":" ")+"TikTok hissəsi API qoşulana qədər əl ilə paylaşılır.":"");};''')
rep('''    if(pubMode==="auto"){const bad=smmAutoProblem(curM(),v,asStory);''','''    if(pubMode==="auto"&&!plats.has("instagram")){alert("Avtomatik paylaşım hələlik yalnız Instagram üçündür. Instagram-ı seç və ya «Əl ilə» / «Xatırlatma» istifadə et.");return;}
    if(pubMode==="auto"){const bad=smmAutoProblem(curM(),v,asStory);''')
rep('''caption:q("#s7").value.trim(),publish_mode:pubMode,''','''caption:plats.has("instagram")?q("#s7").value.trim():"",caption_tt:plats.has("tiktok")?q("#s9").value.trim():"",platforms:[...plats],publish_mode:pubMode,''')
# detail
rep('''    ${p.caption?`<div class="field"><label>Instagram mətni</label><div style="white-space:pre-wrap;font-size:13.5px">${esc(p.caption)}</div></div>`:""}''','''    ${Array.isArray(p.platforms)&&p.platforms.length?`<div class="hint" style="margin-bottom:10px">Platformalar: ${p.platforms.map(x=>x==="tiktok"?"TikTok":"Instagram").join(", ")}</div>`:""}
    ${p.caption?`<div class="field"><label>Instagram mətni</label><div style="white-space:pre-wrap;font-size:13.5px">${esc(p.caption)}</div></div>`:""}
    ${p.caption_tt?`<div class="field"><label>TikTok mətni</label><div style="white-space:pre-wrap;font-size:13.5px">${esc(p.caption_tt)}</div></div>`:""}''')
open(dst,"w",encoding="utf-8").write(s);print("ok")

import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src,encoding="utf-8").read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:90])
    s=s.replace(a,b)
rep('APP_VERSION="2026.11.06g"','APP_VERSION="2026.11.06h"')
# --- CSS: Instagram-a yaxın önizləmə
rep('@media (max-width:860px){.smc-grid{grid-template-columns:1fr}.smc-right{position:static}}','''.smc-ig svg,.smc-igr svg,.smc-igs svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;display:block}
.smc-ig-top{padding:9px 10px}
.smc-ring{padding:2px;border-radius:50%;background:linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5);display:inline-grid}
.smc-ring .smc-av{border:2px solid var(--surface);width:30px;height:30px}
.smc-ig-who{display:flex;flex-direction:column;line-height:1.2;min-width:0;flex:1}
.smc-ig-who b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.smc-ig-who small{font-size:11px;color:var(--muted)}
.smc-dots{margin-left:auto;font-weight:700;letter-spacing:1px;color:var(--ink)}
.smc-ig-act{display:flex;gap:14px;align-items:center;padding:9px 12px 4px}
.smc-ig-act .sv{margin-left:auto}
.smc-ig-likes{padding:0 12px;font-size:13px;font-weight:700}
.smc-ig-cap{max-height:none;overflow:visible}
.smc-clamp{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.smc-more{border:0;background:none;padding:0;color:var(--muted);font-size:13px;cursor:pointer}
.smc-ig-time{padding:0 12px 12px;font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.3px}
.smc-ailab{display:inline-block;font-size:11px;color:var(--muted)}
.smc-igr,.smc-igs{position:relative;aspect-ratio:9/16;max-height:520px;background:#000;border-radius:16px;overflow:hidden;display:grid;color:#fff;box-shadow:var(--shadow)}
.smc-igr>img,.smc-igs>img,.smc-igr>.smc-noimg,.smc-igs>.smc-noimg{grid-area:1/1;width:100%;height:100%;object-fit:cover}
.smc-igr-top{position:absolute;top:12px;left:14px;right:14px;display:flex;justify-content:space-between;font-weight:700;font-size:16px;text-shadow:0 1px 3px rgba(0,0,0,.5)}
.smc-igr-side{position:absolute;right:10px;bottom:80px;display:flex;flex-direction:column;align-items:center;gap:16px;font-size:11px;text-shadow:0 1px 3px rgba(0,0,0,.6)}
.smc-igr-side span{display:flex;flex-direction:column;align-items:center;gap:3px}
.smc-igr-side svg{width:26px;height:26px}
.smc-igr-bot{position:absolute;left:0;right:56px;bottom:0;padding:40px 12px 14px;font-size:12.5px;line-height:1.4;background:linear-gradient(transparent,rgba(0,0,0,.75))}
.smc-igr-who{display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px}
.smc-igr-who .smc-av{width:28px;height:28px}
.smc-follow{border:1px solid rgba(255,255,255,.8);border-radius:8px;padding:2px 9px;font-size:12px;font-weight:600}
.smc-igr-bot p{margin:6px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}
.smc-igr-bot .smc-more,.smc-igr-bot .smc-ailab{color:#d8d8e4}
.smc-igr-aud{margin-top:6px;font-size:12px;opacity:.95;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.smc-igs-bar{position:absolute;top:8px;left:8px;right:8px;height:3px;border-radius:3px;background:rgba(255,255,255,.4)}
.smc-igs-bar i{display:block;width:35%;height:100%;border-radius:3px;background:#fff}
.smc-igs-top{position:absolute;top:18px;left:10px;right:10px;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;text-shadow:0 1px 3px rgba(0,0,0,.5)}
.smc-igs-top small{font-weight:500;opacity:.8}
.smc-igs-top .smc-av{width:30px;height:30px}
.smc-igs-bot{position:absolute;left:10px;right:10px;bottom:12px;display:flex;align-items:center;gap:12px}
.smc-igs-bot span{flex:1;border:1px solid rgba(255,255,255,.7);border-radius:22px;padding:8px 14px;font-size:13px}
.smc-row input[type=text],.smc-row input[type=number]{font-size:12.5px;padding:5px 8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--ink);width:150px}
.smc-row input[type=number]{width:80px}
@media (max-width:860px){.smc-grid{grid-template-columns:1fr}.smc-right{position:static}}''')
# --- Instagram ayarları bloku (TikTok ayarlarından əvvəl)
rep('''    <div class="smc-set" id="smc-tt">''','''    <div class="smc-set" id="smc-igset">
      <div class="smc-set-h">Instagram ayarları</div>
      <div data-igf>
      <label class="smc-row"><span>«AI ilə yaradılıb» işarəsi</span><input type="checkbox" id="ig-ai"></label>
      <label class="smc-row"><span>Həmmüəllif (Collab)</span><input type="text" id="ig-collab" placeholder="@hesab, maks. 3"></label>
      <label class="smc-row" data-igv><span>Lentdə də göstər</span><input type="checkbox" id="ig-feed"></label>
      <label class="smc-row" data-igv><span>Örtük kadrı (saniyə)</span><input type="number" id="ig-cover" min="0" step="0.5" placeholder="0"></label>
      <label class="smc-row" data-igv><span>Audio adı</span><input type="text" id="ig-audio" maxlength="100" placeholder="Orijinal səs"></label>
      <label class="smc-row" data-igp><span>Alt mətn (əlçatanlıq)</span><input type="text" id="ig-alt" maxlength="1000" placeholder="Şəkildə nə var"></label>
      </div>
      <div class="hint" id="ig-sh" style="white-space:normal"></div>
    </div>
    <div class="smc-set" id="smc-tt">''')
# --- Instagram önizləməsi: lent, Reels və Story
rep('''  let pvTab=plats.has("instagram")?"instagram":"tiktok";''','''  let pvTab=plats.has("instagram")?"instagram":"tiktok",capOpen=false;
  const igO=Object.assign({ai:false,collab:[],share_to_feed:true,cover_s:"",audio:"",alt:""},(e.ig_opts&&typeof e.ig_opts==="object")?e.ig_opts:{});
  q("#ig-ai").checked=!!igO.ai;q("#ig-collab").value=(igO.collab||[]).map(x=>"@"+x).join(", ");q("#ig-feed").checked=igO.share_to_feed!==false;q("#ig-cover").value=igO.cover_s||"";q("#ig-audio").value=igO.audio||"";q("#ig-alt").value=igO.alt||"";
  const igCollab=()=>q("#ig-collab").value.split(/[\\s,]+/).map(x=>x.replace(/^@/,"").trim()).filter(Boolean);
  const SV={heart:'<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>',
    com:'<svg viewBox="0 0 24 24"><path d="M20.7 16.4A9 9 0 1 0 17 20l4 1-0.3-4.6z"/></svg>',
    send:'<svg viewBox="0 0 24 24"><path d="M22 3 9.2 10.1M22 3l-7 18-3.8-8.4L3 9.9z"/></svg>',
    save:'<svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1z"/></svg>',
    rep:'<svg viewBox="0 0 24 24"><path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/></svg>'};''')
rep('''    q("#smc-tabs").innerHTML=[...plats].sort().map(p=>`<button type="button" data-pv="${p}" class="${p===pvTab?"on":""}">${p==="tiktok"?"TikTok":"Instagram"}</button>`).join("");''','''    const isV0=kinds.has("video")&&!kinds.has("foto");
    const tabs=[];if(plats.has("instagram")){if(dest!=="story")tabs.push(["instagram",isV0?"Reels":"Lent"]);if(dest!=="feed")tabs.push(["story","Story"]);}if(plats.has("tiktok"))tabs.push(["tiktok","TikTok"]);
    if(!tabs.some(t=>t[0]===pvTab))pvTab=tabs[0][0];
    q("#smc-tabs").innerHTML=tabs.map(([p,l])=>`<button type="button" data-pv="${p}" class="${p===pvTab?"on":""}">${l}</button>`).join("");''')
rep('''    else{const cap=q("#s7").value.trim();
      q("#smc-phone").innerHTML=`<div class="smc-ig"><div class="smc-ig-top"><span class="smc-av">${h.slice(0,1).toUpperCase()}</span><b>${h}</b></div><div class="smc-ig-media${isVid?" vid":""}">${media}</div><div class="smc-ig-act">♡ &nbsp;💬 &nbsp;➤</div><div class="smc-ig-cap">${cap?`<b>${h}</b> ${esc(cap)}`:`<span class="smc-empty">Instagram mətni burada görünəcək</span>`}</div></div>`;}''','''    else{const cap=q("#s7").value.trim(),av=`<span class="smc-av">${h.slice(0,1).toUpperCase()}</span>`,col=igCollab(),ai=q("#ig-ai").checked;
      const who=h+(col.length?` və ${col.length===1?esc(col[0]):col.length+" nəfər"}`:"");
      const capH=cap?`<span class="${capOpen?"":"smc-clamp"}" data-cap><b>${h}</b> ${esc(cap)}</span>${capOpen||(cap.length<90&&!cap.includes("\\n"))?"":`<button type="button" class="smc-more" data-more>daha çox</button>`}`:`<span class="smc-empty">Instagram mətni burada görünəcək</span>`;
      if(pvTab==="story"){
        q("#smc-phone").innerHTML=`<div class="smc-igs">${media}<div class="smc-igs-bar"><i></i></div><div class="smc-igs-top"><span class="smc-ring">${av}</span>${h} <small>İndi</small></div><div class="smc-igs-bot"><span>Mesaj göndər</span>${SV.heart}${SV.send}</div></div>`;}
      else if(isVid){
        const aud=esc(q("#ig-audio").value.trim()||"Orijinal səs");
        q("#smc-phone").innerHTML=`<div class="smc-igr">${media}<div class="smc-igr-top"><span>Reels</span></div><div class="smc-igr-side"><span>${SV.heart}Bəyən</span><span>${SV.com}Şərh</span><span>${SV.rep}</span><span>${SV.send}</span></div><div class="smc-igr-bot"><div class="smc-igr-who"><span class="smc-ring">${av}</span>${who}<span class="smc-follow">İzlə</span></div>${ai?`<div class="smc-ailab">Süni intellekt məlumatı</div>`:""}<p>${cap?`<span class="${capOpen?"":"smc-clamp"}">${esc(cap)}</span>${capOpen||cap.length<70?"":`<button type="button" class="smc-more" data-more>daha çox</button>`}`:`<span class="smc-empty" style="color:#cfcfe0">Instagram mətni burada görünəcək</span>`}</p><div class="smc-igr-aud">♫ ${h} · ${aud}</div></div></div>`;}
      else q("#smc-phone").innerHTML=`<div class="smc-ig"><div class="smc-ig-top"><span class="smc-ring">${av}</span><span class="smc-ig-who"><b>${who}</b>${ai?`<small>Süni intellekt məlumatı</small>`:""}</span><span class="smc-dots">···</span></div><div class="smc-ig-media">${media}</div><div class="smc-ig-act">${SV.heart}${SV.com}${SV.send}<span class="sv">${SV.save}</span></div><div class="smc-ig-likes">Bəyənmələr</div><div class="smc-ig-cap">${capH}</div><div class="smc-ig-time">İndi</div></div>`;
      const mb=q("#smc-phone [data-more]");if(mb)mb.onclick=()=>{capOpen=true;drawPreview();};}
    const igOn=plats.has("instagram");q("#smc-igset").style.display=igOn?"":"none";
    q("[data-igf]").style.display=dest==="story"?"none":"";
    scrim.querySelectorAll("[data-igv]").forEach(x=>x.style.display=isVid?"":"none");scrim.querySelectorAll("[data-igp]").forEach(x=>x.style.display=isVid?"none":"");
    q("#ig-sh").textContent=dest==="story"?"Story üçün əlavə ayar yoxdur. Mətn Story-də görünmür.":(dest==="both"?"Ayarlar lent paylaşımına aiddir, Story-yə tətbiq olunmur. ":"")+(pubMode==="auto"?"Avtomatik paylaşımda Instagram-a özü ötürülür.":"Əl ilə paylaşanda bu ayarları Instagram tətbiqində qoy.");''')
rep('''  ["#s7","#s9","#s5"].forEach(id=>q(id).addEventListener("input",drawPreview));''','''  ["#s7","#s9","#s5","#ig-collab","#ig-audio"].forEach(id=>q(id).addEventListener("input",drawPreview));
  q("#ig-ai").addEventListener("change",drawPreview);
  scrim.querySelectorAll("[data-dest]").forEach(b=>b.addEventListener("click",()=>drawPreview()));''')
# --- yadda saxla: ig_opts
rep('''    if(pubMode==="auto"&&!plats.has("instagram")){''','''    if(plats.has("instagram")&&dest!=="story"){const col=igCollab();if(col.length>3){alert("Instagram ən çox 3 həmmüəllif qəbul edir.");return;}if(col.some(x=>!/^[A-Za-z0-9._]{1,30}$/.test(x))){alert("Həmmüəllif adı düzgün deyil: yalnız Instagram istifadəçi adı yaz (məs. @mezmoon).");return;}}
    if(pubMode==="auto"&&!plats.has("instagram")){''')
rep('''ai:q("#tt-ai").checked}:{},publish_mode:pubMode,''','''ai:q("#tt-ai").checked}:{},ig_opts:plats.has("instagram")?{ai:q("#ig-ai").checked,collab:igCollab(),share_to_feed:q("#ig-feed").checked,cover_s:q("#ig-cover").value?Math.max(0,+q("#ig-cover").value):"",audio:q("#ig-audio").value.trim(),alt:q("#ig-alt").value.trim()}:{},publish_mode:pubMode,''')
open(dst,"w",encoding="utf-8").write(s);print("ok")

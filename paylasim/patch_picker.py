import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src,encoding="utf-8").read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:80])
    s=s.replace(a,b)
rep('APP_VERSION="2026.11.06b"','APP_VERSION="2026.11.06c"')
rep('''  const drawPub=()=>{const v=curV();const sel=curM();const K=[...kinds];
    const items=v?smmLibrary(v).filter(it=>it.folder_id?K.includes("foto"):K.includes(smmIsVideo(it)?"video":"foto")):[];''','''  let pickF="";
  const drawPub=()=>{const v=curV();const sel=curM();
    const lib=v?smmLibrary(v):[];const kindOf=it=>it.kind==="dizayn"?"dizayn":it.folder_id||!smmIsVideo(it)?"foto":"video";
    const items=lib.filter(it=>!pickF||kindOf(it)===pickF);
    const chips=lib.length?`<div class="pchips" style="max-height:none;margin-bottom:8px">${[["","Hamısı"],["video","🎬 Video"],["foto","📷 Foto"],["dizayn","🎨 Dizayn"]].map(([k,l])=>{const n=k?lib.filter(it=>kindOf(it)===k).length:lib.length;return n||!k?`<button type="button" class="pchip${pickF===k?" on":""}" data-pf2="${k}">${l} <span style="opacity:.6">${n}</span></button>`:"";}).join("")}</div>`:"";''')
rep('''    q("#s-pick").innerHTML=items.length?`<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px">''','''    q("#s-pick").innerHTML=chips+(items.length?`<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px">''')
rep('''`:`<div class="hint" style="white-space:normal">Bu məkan və növ üçün material yoxdur.</div>`;''','''`:`<div class="hint" style="white-space:normal">${lib.length?"Bu bölmədə material yoxdur.":"Bu məkan üçün material yoxdur. Çəkiliş videoları, foto qovluqları və hazır dizaynlar burada özü görünür."}</div>`);
    q("#s-pick").querySelectorAll("[data-pf2]").forEach(b=>b.onclick=()=>{pickF=b.dataset.pf2;drawPub();});''')
rep('''    const choose=async it=>{const row=await smmRegister(it,curV());if(!row)return;mediaId=mediaId===row.id?null:row.id;const m=curM();if(m)q("#s5").value=smmMediaLink(m);drawPub();};''','''    const choose=async it=>{const row=await smmRegister(it,curV());if(!row)return;mediaId=mediaId===row.id?null:row.id;const m=curM();if(m)q("#s5").value=smmMediaLink(m);
      /* Növ seçilən materiala uyğunlaşır: video seçiləndə «Video», şəkil seçiləndə «Foto» */
      if(m){const want=smmIsVideo(m)?"video":"foto";if(!kinds.has(want)||kinds.size>1){kinds.clear();kinds.add(want);scrim.querySelectorAll("[data-k]").forEach(x=>x.classList.toggle("on",kinds.has(x.dataset.k)));scrim.querySelectorAll("[data-tk]").forEach(x=>x.style.display=kinds.has(x.dataset.tk)?"flex":"none");syncTime();}}
      drawPub();};''')
open(dst,"w",encoding="utf-8").write(s);print("ok")

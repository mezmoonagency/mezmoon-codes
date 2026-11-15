s=open("teklif-new7.html",encoding="utf-8").read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:70])
    s=s.replace(a,b)
rep("/* müştərilərimiz */","""html.th-wt .lockup .venues{background:#fff;border-radius:14px;padding:clamp(10px,1.4vw,16px) clamp(14px,2vw,24px)}
html.th-wt .lockup .venues b{color:#6A3BE4}
html.th-wt .reels{background:linear-gradient(180deg,rgba(255,156,245,.12),transparent 70%);border-block-color:rgba(255,156,245,.35)}
html.th-wt .vs-col.good{border-color:rgba(255,156,245,.55);background:linear-gradient(150deg,rgba(255,156,245,.16),rgba(44,230,240,.06) 60%,transparent)}
html.th-wt .vs-col.good b,html.th-wt .stat.hot b,html.th-wt .k b{background:var(--wt-grad);-webkit-background-clip:text;background-clip:text;color:transparent}
html.th-wt .vs-col.good .vs-bar s{background:var(--wt-grad)}
html.th-wt .tbl tr.me td{background:rgba(255,156,245,.10)}
html.th-wt .tbl tr.me td:first-child{box-shadow:inset 3px 0 0 var(--wt-pink)}
.wt-strip{background:var(--wt-grad,linear-gradient(90deg,#2CE6F0,#9FB8F6 50%,#FF9CF5));overflow:hidden;padding:14px 0}
.wt-strip-in{display:flex;gap:clamp(36px,6vw,90px);width:max-content;animation:mcslide 28s linear infinite}
.wt-strip img{height:22px;width:auto;max-width:none;filter:brightness(0) invert(1)}
@media print{.wt-strip{display:none}}
/* müştərilərimiz */""")
rep('const WA="https://wa.me/message/JAX4ISB7KC6IC1";','let WA="https://wa.me/message/JAX4ISB7KC6IC1";')
rep('''if(M.theme==="wt")document.documentElement.classList.add("th-wt");''','''const WT=M.theme==="wt";const R=WT?M.ref||null:null;if(WT)document.documentElement.classList.add("th-wt");''')
rep('''<p class="eyebrow">${esc(M.eyebrow||p.title||"Kontent strategiyası və aylıq paket")}''','''<p class="eyebrow">${R?"Marketinq strategiyası":esc(M.eyebrow||p.title||"Kontent strategiyası və aylıq paket")}''')
rep('''<h1><span lang="en">Price List for</span><br>''','''<h1><span lang="en">${R?"Marketing plan for":"Price List for"}</span><br>''')
rep('''${p.intro?`<p class="dek">${esc(p.intro).replace(/\\n/g,"<br>")}</p>`:""}''','''${R?`<p class="dek">${esc(R.dek)}</p>`:p.intro?`<p class="dek">${esc(p.intro).replace(/\\n/g,"<br>")}</p>`:""}''')
rep('''<div class="meta"><span>Məkan · <b>${esc(name)}</b></span>''','''<div class="meta">${R?R.meta.map(x=>`<span>${esc(x[0])} · <b>${esc(x[1])}</b></span>`).join(""):`<span>Məkan · <b>${esc(name)}</b></span>''')
rep('''<span>Hazırlayan · <b>MezMoon</b></span>${p.updated_at?`<span>Yenilənib · <b>${new Date(p.updated_at).toLocaleDateString("az")}</b></span>`:""}</div>''','''<span>Hazırlayan · <b>${WT?"WeTrend":"MezMoon"}</b></span>${p.updated_at?`<span>Yenilənib · <b>${new Date(p.updated_at).toLocaleDateString("az")}</b></span>`:""}`}</div>''')
rep('''  if(a){
''','''  if(R){h+=refSections(R,D||{},nx);}
  else if(a){
''')
rep('''  const dkOn=D&&!D.off;''','''  const dkOn=D&&!D.off&&!R;''')
rep('''  // portfolio (statik blok)''','''  if(WT)wtBrand(name);
  // portfolio (statik blok)''')
rep('''function draw(p){''','''/* WeTrend məlumatları: yalnız meta.theme="wt" */
function wtBrand(name){
  const mail="office@wetrend.az";
  WA="mailto:"+mail+"?subject="+encodeURIComponent(name+" — təklif");
  document.title="Marketing Plan for "+name+" | WeTrend";
  const de=document.querySelector('meta[name="description"]');if(de)de.content="WeTrend-dən "+name+" üçün hazırlanmış marketinq strategiyası.";
  const ic=document.querySelector('link[rel="icon"]');if(ic){ic.type="image/png";ic.href="wetrend-logo.png";}
  const na=$(".nav-logo");if(na)na.setAttribute("aria-label","WeTrend");
  const end=$("#elaqe");
  if(end){const c=end.querySelector(".cta-btn");if(c){c.href=WA;c.removeAttribute("target");c.textContent="Bizə yazın";}
    const k=end.querySelector(".contacts");if(k)k.innerHTML=`<a href="mailto:${mail}"><span>E-poçt</span>${mail}</a><a href="https://www.instagram.com/wetrend.az/" target="_blank" rel="noopener"><span>Instagram</span>@wetrend.az</a>`;
    if(!$(".wt-strip")){const im='<img src="wetrend-logo.png" alt="">';end.insertAdjacentHTML("afterend",`<div class="wt-strip" aria-hidden="true"><div class="wt-strip-in">${im.repeat(16)}</div></div>`);}}
  const ft=$("#ftn");
  if(ft){const f=ft.parentNode;f.firstElementChild.textContent="© 2026 WETREND";f.lastElementChild.textContent="WE DON’T FOLLOW TRENDS — WE CREATE THEM.";}
}
function refSections(R,D,nx){
  const label=t=>`<div class="sec-label rv"><h2>${esc(t)}</h2><span class="idx">${nx()}</span></div>`;
  const big=(t,w)=>`<p class="big rv" style="max-width:${w||22}ch">${esc(t)}</p>`;
  const num=i=>String(i+1).padStart(2,"0");
  const items=arr=>`<div class="grp rv" style="margin-top:clamp(24px,3vw,36px)">${arr.map((x,i)=>`<div class="item"><span class="n">${num(i)}</span><p><b>${esc(x[0])}</b> ${esc(x[1])}</p></div>`).join("")}</div>`;
  const S=R.state,L=R.reels,V=R.rivals,G=R.gaps,T=R.trends,X=R.mix,P=R.plan,C=R.services;
  let o=`<section class="promise" id="veziyyet"><div class="wrap">${label("Mövcud vəziyyət")}${big(S.big)}<p class="lead-p rv">${S.lead}</p>
    <div class="stat-grid rv">${S.stats.map(x=>`<div class="stat${x[2]?" hot":""}"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join("")}</div><p class="note rv">${esc(S.note)}</p></div></section>`;
  const vc=(c,x)=>`<div class="vs-col ${c}"><span>${esc(x[0])}</span><b>${esc(x[1])}</b><i>${esc(x[2])}</i><div class="vs-bar"><s style="width:${x[3]}%"></s></div></div>`;
  o+=`<section class="reels" id="reels"><div class="wrap">${label(L.label)}<p class="big rv" style="max-width:20ch">${esc(L.bigA)}<span class="red">${esc(L.bigB)}</span></p><p class="lead-p rv">${L.lead}</p>
    <div class="vs rv">${vc("bad",L.vs.bad)}${vc("good",L.vs.good)}</div>
    <div class="rules rv">${L.rules.map((x,i)=>`<div class="rule"><b>${num(i)}</b><p><strong>${esc(x[0])}</strong> ${esc(x[1])}</p></div>`).join("")}</div></div></section>`;
  if((D.ig||[]).length||(D.posts||[]).length){
    o+=`<section id="ig-analiz"><div class="wrap">${label("Instagram analizi")}${big("Səhifənizə necə baxdıq")}${D.summary?`<p class="lead-p rv">${esc(D.summary)}</p>`:""}
      ${(D.ig||[]).length?`<div class="grp rv" style="margin-top:clamp(24px,3vw,36px)">${D.ig.map((x,i)=>`<div class="item"><span class="n">${num(i)}</span><p>${x.t?`<b>${esc(x.t)}.</b> `:""}${esc(x.d||"")}</p></div>`).join("")}</div>`:""}
      ${(D.posts||[]).length?`<div class="dk-posts rv">${D.posts.map(x=>`<a class="dk-post" href="${esc(x.url)}" target="_blank" rel="noopener">${x.img?`<img src="${esc(x.img)}" alt="" loading="lazy">`:""}<div>${x.verdict?`<b>${esc(x.verdict)}</b>`:""}<p>${esc(x.note)}</p></div></a>`).join("")}</div>`:""}</div></section>`;
  }
  o+=`<section id="reqibler"><div class="wrap">${label("Rəqib analizi")}${big(V.big)}<div class="tbl-wrap rv"><table class="tbl"><thead><tr>${V.head.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>
    ${V.rows.map(r=>`<tr${r[6]?' class="me"':""}><td><b>${esc(r[0])}</b><span>${esc(r[1])}</span></td><td>${esc(r[2])}</td><td${r[7]?' class="up"':""}>${esc(r[3])}</td><td>${esc(r[4])}</td><td>${esc(r[5])}</td></tr>`).join("")}</tbody></table></div>
    <p class="fine rv">${esc(V.fine)}</p><div class="pr-grid rv">${V.lessons.map((x,i)=>`<div class="pr"><b>DƏRS ${num(i)}</b><h3>${esc(x[0])}</h3><p>${esc(x[1])}</p></div>`).join("")}</div></div></section>`;
  o+=`<section class="promise" id="bosluqlar"><div class="wrap">${label("Boşluqlar")}${big(G.big)}${items(G.items)}</div></section>`;
  o+=`<section id="trendler"><div class="wrap">${label(T.label)}${big(T.big)}<div class="tr-grid rv">${T.items.map(x=>`<article class="tr"><span class="tr-src">${esc(x[0])}</span><h3>${esc(x[1])}</h3><p>${esc(x[2])}</p><div class="tr-us"><b>Biz:</b> ${esc(x[3])}</div></article>`).join("")}</div><p class="fine rv">${esc(T.fine)}</p></div></section>`;
  const col=c=>c.startsWith("--")?`var(${c})`:c;
  o+=`<section class="promise" id="sutunlar"><div class="wrap">${label("Kontent sütunları")}${big(X.big)}<div class="mix rv"><div class="mix-bar">${X.items.map(x=>`<span style="flex:${x[0]};background:${col(x[3])}">${x[0]}%</span>`).join("")}</div>
    <div class="mix-leg">${X.items.map(x=>`<div><i style="background:${col(x[3])}"></i><b>${esc(x[1])}</b><span>${esc(x[2])}</span></div>`).join("")}</div></div></div></section>`;
  o+=`<section id="plan"><div class="wrap">${label("90 günlük plan")}${big(P.big)}<div class="road rv">${(D.plan||[]).map((m,i)=>`<div class="ph"><span class="ph-n">Ay ${i+1}</span><h3>${esc(m.focus||m.period)}</h3><ul>${(m.items||[]).map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>`).join("")}</div>
    <div class="kpi rv">${P.kpi.map(k=>`<div class="k"><b>${esc(k[0])}</b><span>${k[1]}</span></div>`).join("")}</div><p class="fine rv">${esc(P.fine)}</p></div></section>`;
  if((D.promises||[]).length)o+=`<section class="promise" id="vedimiz"><div class="wrap">${label("Vədimiz")}${big("Komandamız nə edəcək")}<div class="grp rv" style="margin-top:clamp(24px,3vw,36px)">${D.promises.map((x,i)=>`<div class="item"><span class="n">${num(i)}</span><p>${x.t?`<b>${esc(x.t)}.</b> `:""}${esc(x.d||"")}</p></div>`).join("")}</div></div></section>`;
  o+=`<section id="xidmetler"><div class="wrap">${label("Xidmətlərimizə daxildir")}${big(C.big)}<div class="svc-grid rv">${C.groups.map(g=>`<div class="grp"><div class="grp-head"><h3>${esc(g[0])}</h3><span>${esc(g[1])}</span></div>${g[2].map((t,i)=>`<div class="item"><span class="n">${num(i)}</span><p>${esc(t)}</p></div>`).join("")}</div>`).join("")}</div></div></section>`;
  return o;
}
function draw(p){''')
s=s.replace('''const nl=$(".nav-logo img");if(nl){nl.src="wetrend-logo.png";nl.alt="WeTrend";}''','''const nl=$(".nav-logo img");if(nl){nl.src="wetrend-logo.png";nl.alt="WeTrend";}''')
open("teklif-new8.html","w",encoding="utf-8").write(s)

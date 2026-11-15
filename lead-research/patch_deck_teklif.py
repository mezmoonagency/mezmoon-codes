s=open("../teklif-mutexessis/teklif-new2.html",encoding="utf-8").read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:70])
    s=s.replace(a,b)
rep("/* ============ packages ============ */","""/* ============ təqdimat ============ */
.dk-sum{max-width:62ch;margin:clamp(14px,2vw,22px) 0 0;font-size:clamp(16px,1.5vw,20px);line-height:1.5;color:var(--paper)}
.dk-posts{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:clamp(12px,2vw,20px);margin-top:clamp(24px,3vw,38px)}
.dk-post{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:var(--panel);color:inherit;text-decoration:none}
.dk-post img{display:block;width:100%;aspect-ratio:4/5;object-fit:cover}
.dk-post div{padding:14px 16px 16px}
.dk-post b{display:block;font-family:var(--mono);font-size:10.5px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--lav);margin-bottom:7px}
.dk-post p{margin:0;font-size:14px;line-height:1.5;color:#E1E1E6}
.dk-tg{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:clamp(12px,2vw,20px);margin-top:clamp(24px,3vw,38px)}
.dk-t{border:1px solid var(--line-2);border-radius:18px;padding:18px 20px;background:var(--panel)}
.dk-t span{display:block;font-family:var(--mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.dk-t b{display:block;margin:10px 0 6px;font-family:var(--display);font-weight:500;font-size:clamp(20px,2vw,26px);line-height:1.15;color:var(--paper)}
.dk-t em{font-style:normal;font-size:13px;color:var(--muted)}
.dk-t i{font-style:normal;color:var(--lav)}
.dk-note{margin:14px 0 0;font-size:12.5px;color:var(--muted)}
.dk-plan{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:clamp(12px,2vw,20px);margin-top:clamp(24px,3vw,38px)}
.dk-m{border-top:2px solid var(--lav);padding-top:14px}
.dk-m span{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--lav)}
.dk-m h3{margin:8px 0 10px;font-family:var(--display);font-weight:500;font-size:clamp(18px,1.7vw,23px);line-height:1.2}
.dk-m ul{margin:0;padding-left:18px;font-size:14.5px;line-height:1.55;color:#E1E1E6}
.dk-m li{margin:5px 0}

/* ============ packages ============ */""")
rep('''  const st=(p.strategy||[]).filter(x=>x&&(x.t||x.d));''','''  const dkOn=D&&!D.off;
  const dkList=(arr)=>arr.map((x,i)=>`<div class="item"><span class="n">${String(i+1).padStart(2,"0")}</span><p>${x.t?`<b>${esc(x.t)}.</b> `:""}${esc(x.d||"")}</p></div>`).join("");
  if(dkOn&&((D.ig||[]).length||(D.posts||[]).length)){
    h+=`<section id="ig-analiz"><div class="wrap">
      <div class="sec-label rv"><h2>Instagram analizi</h2><span class="idx">${nx()}</span></div>
      <p class="big rv" style="max-width:22ch">Səhifənizə necə baxdıq</p>
      ${D.summary?`<p class="dk-sum rv">${esc(D.summary)}</p>`:""}
      ${(D.ig||[]).length?`<div class="svc-grid rv" style="grid-template-columns:1fr"><div class="grp">${dkList(D.ig)}</div></div>`:""}
      ${(D.posts||[]).length?`<div class="dk-posts rv">${D.posts.map(x=>`<a class="dk-post" href="${esc(x.url)}" target="_blank" rel="noopener">${x.img?`<img src="${esc(x.img)}" alt="" loading="lazy">`:""}<div>${x.verdict?`<b>${esc(x.verdict)}</b>`:""}<p>${esc(x.note)}</p></div></a>`).join("")}</div>`:""}
    </div></section>`;
  }
  const st=(p.strategy||[]).filter(x=>x&&(x.t||x.d));''')
rep('''  if(M.note_body){
    h+=`<section class="promise" id="qeyd">''','''  if(dkOn&&(D.promises||[]).length){
    h+=`<section class="promise" id="vedimiz"><div class="wrap">
      <div class="sec-label rv"><h2>Vədimiz</h2><span class="idx">${nx()}</span></div>
      <p class="big rv" style="max-width:22ch">Komandamız nə edəcək</p>
      <div class="svc-grid rv" style="grid-template-columns:1fr"><div class="grp">${dkList(D.promises)}</div></div></div></section>`;
  }
  if(dkOn&&(D.targets||[]).length){
    h+=`<section id="hedefler"><div class="wrap">
      <div class="sec-label rv"><h2>Hədəflər</h2><span class="idx">${nx()}</span></div>
      <p class="big rv" style="max-width:22ch">Nəyə çatmağı hədəfləyirik</p>
      <div class="dk-tg rv">${D.targets.map(t=>`<div class="dk-t"><span>${esc(t.metric)}</span><b>${t.now?`${esc(t.now)} <i>→</i> `:""}${esc(t.goal)}</b>${t.when?`<em>${esc(t.when)}</em>`:""}</div>`).join("")}</div>
      <p class="dk-note rv">Bunlar birgə iş üçün hədəflərdir, nəticə zəmanəti deyil.</p></div></section>`;
  }
  if(dkOn&&(D.plan||[]).length){
    h+=`<section id="plan"><div class="wrap">
      <div class="sec-label rv"><h2>Gələcək plan</h2><span class="idx">${nx()}</span></div>
      <p class="big rv" style="max-width:22ch">Addım-addım plan</p>
      <div class="dk-plan rv">${D.plan.map(m=>`<div class="dk-m"><span>${esc(m.period)}</span>${m.focus?`<h3>${esc(m.focus)}</h3>`:""}<ul>${(m.items||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}</div></div></section>`;
  }
  if(M.note_body){
    h+=`<section class="promise" id="qeyd">''')
rep('''const M=p.meta||{};''','''const M=p.meta||{};const D=M.deck||null;''')
rep('''${(a.good||[]).length?`<div><h3>Güclü tərəflər</h3><ul>${a.good.map(''','''${((D&&!D.off&&D.pros&&D.pros.length)?D.pros:a.good||[]).length?`<div><h3>Güclü tərəflər</h3><ul>${((D&&!D.off&&D.pros&&D.pros.length)?D.pros:a.good).map(''')
rep('''${(a.bad||[]).length?`<div class="bad"><h3>İnkişaf nöqtələri</h3><ul>${a.bad.map(''','''${((D&&!D.off&&D.cons&&D.cons.length)?D.cons:a.bad||[]).length?`<div class="bad"><h3>İnkişaf nöqtələri</h3><ul>${((D&&!D.off&&D.cons&&D.cons.length)?D.cons:a.bad).map(''')
open("../teklif-mutexessis/teklif-new4.html","w",encoding="utf-8").write(s)

import sys
s=open(sys.argv[1],encoding='utf8').read()
def rep(a,b):
    global s
    assert s.count(a)==1,a[:60]
    s=s.replace(a,b)
rep("/* ============ packages ============ */","""/* ============ mütəxəssis ============ */
.xp{position:relative;overflow:hidden;padding-block:clamp(56px,8vw,110px)}
.xp-card{position:relative;display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(24px,4vw,64px);align-items:center;
  border:1px solid rgba(151,148,229,.45);border-radius:32px;padding:clamp(18px,3vw,40px);
  background:linear-gradient(150deg,rgba(151,148,229,.2),rgba(202,33,38,.08) 58%,transparent 90%)}
.xp-photo{position:relative;border-radius:24px;overflow:hidden;aspect-ratio:1;box-shadow:0 30px 90px rgba(151,148,229,.3)}
.xp-photo img{display:block;width:100%;height:100%;object-fit:cover}
.xp-tag{display:inline-block;font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink);background:var(--lav);border-radius:999px;padding:8px 14px}
.xp-big{margin:18px 0 0;font-family:var(--display);font-weight:600;letter-spacing:-.05em;line-height:.92;font-size:clamp(84px,14vw,190px);
  background:linear-gradient(150deg,var(--lav-hi),var(--lav) 45%,var(--lav-lo));-webkit-background-clip:text;background-clip:text;color:transparent}
.xp-role{margin:10px 0 0;font-family:var(--display);font-weight:600;letter-spacing:-.03em;line-height:1.08;font-size:clamp(24px,3.2vw,42px);color:var(--paper)}
.xp-name{margin:18px 0 0;font-family:var(--display);font-weight:600;letter-spacing:-.02em;font-size:clamp(22px,2.4vw,32px);color:var(--lav)}
.xp-list{list-style:none;margin:22px 0 0;padding:0;display:flex;flex-direction:column;gap:12px}
.xp-list li{position:relative;padding-left:20px;font-size:clamp(15px,1.5vw,18px);line-height:1.5;color:#CFCFD6}
.xp-list li::before{content:"";position:absolute;left:0;top:.6em;width:8px;height:8px;border-radius:50%;background:var(--lav)}
@media (max-width:760px){.xp-card{grid-template-columns:1fr}}
/* ============ packages ============ */""")
rep("""  app.innerHTML=h;
  // portfolio (statik blok)""","""  const X=M.expert;
  if(X&&X.name){
    h+=`<section class="xp" id="mutexessis"><div class="wrap"><div class="xp-card rv">
      ${X.photo?`<div class="xp-photo"><img src="${esc(X.photo)}" alt="${esc(X.name)}" loading="lazy"></div>`:""}
      <div><span class="xp-tag">${esc(X.tag||"Targeting mütəxəssisimiz")}</span>
        ${X.big?`<p class="xp-big">${esc(X.big)}</p>`:""}
        ${X.role?`<p class="xp-role">${esc(X.role)}</p>`:""}
        <p class="xp-name">${esc(X.name)}</p>
        <ul class="xp-list">${(X.lines||[]).filter(Boolean).map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>
    </div></div></section>`;
  }
  app.innerHTML=h;
  // portfolio (statik blok)""")
rep('qeyd:"Əlavə",portfolio:','qeyd:"Əlavə",mutexessis:"Mütəxəssis",portfolio:')
open(sys.argv[2],'w',encoding='utf8').write(s)

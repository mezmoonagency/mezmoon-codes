import re
s=open("index-2026.11.02g.html",encoding="utf-8").read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:70])
    s=s.replace(a,b)
rep('const APP_VERSION="2026.11.02g";','const APP_VERSION="2026.11.02h";')
# təklif hazır pəncərəsi
rep('''<a class="btn ghost" href="${esc(url)}" target="_blank" rel="noopener" style="text-decoration:none">Aç ↗</a><a class="btn ghost" href="${esc(wa)}"''','''<a class="btn ghost" href="${esc(url)}" target="_blank" rel="noopener" style="text-decoration:none">Aç ↗</a><button class="btn ghost" data-lpdf>📄 PDF</button><a class="btn ghost" href="${esc(wa)}"''')
rep('''  document.body.appendChild(scrim);const close=()=>scrim.remove();
''' if False else '''<a class="btn ghost" href="${esc(wa)}" target="_blank" rel="noopener" style="text-decoration:none">WhatsApp</a></div>
  </div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();''','''<a class="btn ghost" href="${esc(wa)}" target="_blank" rel="noopener" style="text-decoration:none">WhatsApp</a></div>
  </div></div>`;
  document.body.appendChild(scrim);const close=()=>scrim.remove();
  scrim.querySelector("[data-lpdf]").onclick=()=>propPdf(p);''')
# lid formasındakı təkliflər siyahısı
m=re.search(r'<button class="mini" data-pc="\$\{[^}]*\}"[^>]*>[^<]*</button>',s)
assert m,"data-pc"
btn=m.group(0)
idexpr=re.search(r'data-pc="(\$\{[^}]*\})"',btn).group(1)
rep(btn,f'<button class="mini" data-ppdf="{idexpr}" title="PDF kimi saxla">📄 PDF</button>'+btn)
rep('''    scrim.querySelectorAll("[data-pc]").forEach(b=>b.onclick=()=>{''','''    scrim.querySelectorAll("[data-ppdf]").forEach(b=>b.onclick=()=>{const p=state.proposals.find(x=>x.id===b.dataset.ppdf);if(p)propPdf(p);});
    scrim.querySelectorAll("[data-pc]").forEach(b=>b.onclick=()=>{''')
open("index-2026.11.02h.html","w",encoding="utf-8").write(s)
print(btn[:90])

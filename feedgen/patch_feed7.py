# 09a -> 09b: Feed-in içində birbaşa "Instagram-ı qoş" düyməsi (profil başlığının altında)
import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
assert s.count('APP_VERSION="2026.11.09a"')==1
s=s.replace('APP_VERSION="2026.11.09a"','APP_VERSION="2026.11.09b"')

anchor='box.appendChild(feedSeg());\n  if(feedMode==="live")'
assert s.count(anchor)==1
ins=('box.appendChild(feedSeg());\n'
     '  if(!acc){const _cl=(smmIgOf(v.client).client);const cb=el("div");cb.style.cssText="margin:0 0 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:10px 12px";'
     'cb.innerHTML=\'<span class="hint" style="margin:0;white-space:normal">Hazırkı feed və avtomatik rəng palitrası üçün bu məkanın Instagram-ı panelə qoşulmalıdır.</span>\';'
     'if(_cl&&smmMediaCanAdd()){const b=el("button","btn sm","📷 Instagram-ı qoş");b.style.marginLeft="auto";b.onclick=()=>smmIgConnect(_cl.id,b);cb.appendChild(b);}'
     'else cb.appendChild(el("span","hint","Bunu CEO/PM/Marketinq/Account edə bilər."));'
     'box.appendChild(cb);}\n'
     '  if(feedMode==="live")')
s=s.replace(anchor,ins)
open(dst,"w").write(s)
print("ok bytes:",len(s))

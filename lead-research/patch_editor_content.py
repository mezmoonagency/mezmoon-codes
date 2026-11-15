s=open("index-2026.11.02h.html",encoding="utf-8").read()
a='editor:{label:"Montajçı",nav:["dash","delivery","videos","subs"],scope:"Montaj və təhvil növbəsi."}'
assert s.count(a)==1
s=s.replace(a,'editor:{label:"Montajçı",nav:["dash","content","delivery","videos","subs"],scope:"Montaj və təhvil növbəsi. Kontent planlarına baxa bilərsən."}')
b='const APP_VERSION="2026.11.02h";'
assert s.count(b)==1
s=s.replace(b,'const APP_VERSION="2026.11.03a";')
open("index-2026.11.03a.html","w",encoding="utf-8").write(s)

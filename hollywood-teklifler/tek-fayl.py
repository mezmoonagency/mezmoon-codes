"""Rəhbərliyə göndərmək üçün tək fayl: menyusuz, şəkillər içində. İşlət: python3 tek-fayl.py"""
import base64,re,os
d=os.path.dirname(os.path.abspath(__file__))
s=open(os.path.join(d,'hw-teklif-r8n3v6p2.html'),encoding='utf-8').read()
s=re.sub(r'<nav class="nav" id="nav">.*?</nav>\n','',s,flags=re.S)
s=s.replace("const nav=document.getElementById('nav'),prog","const nav={classList:{toggle(){}}},prog")
s=s.replace('<meta name="robots" content="noindex,nofollow,noarchive">\n','')
s=s.replace('--nav-h:68px','--nav-h:0px')
logo='data:image/png;base64,'+base64.b64encode(open(os.path.join(d,'hw-mezmoon-logo.png'),'rb').read()).decode()
s=s.replace('src="hw-mezmoon-logo.png"','src="data:," data-logo')
s=s.replace('<script>','<script>const LOGO="%s";document.querySelectorAll("[data-logo]").forEach(i=>i.src=LOGO);'%logo,1)
for f in ['hw-akt-elixan.jpg','hw-akt-azer.jpg','hw-akt-elvin.jpg']:
    s=s.replace('"%s"'%f,'"data:image/jpeg;base64,%s"'%base64.b64encode(open(os.path.join(d,f),'rb').read()).decode())
assert not re.findall(r'hw-(?:akt|mezmoon)[^"\' )]*\.(?:jpg|png)',s)
out=os.path.expanduser('~/Downloads/Hollywood-Group-Teklif.html')
open(out,'w',encoding='utf-8').write(s)
print(out,os.path.getsize(out)//1024,'KB')

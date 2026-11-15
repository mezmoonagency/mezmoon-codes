# -*- coding: utf-8 -*-
import re,sys
s=open("index-2026.11.03b.html",encoding="utf-8").read()
a='const META_FUNC_URL=SB_URL+"/functions/v1/meta-insights";'
assert s.count(a)==1
s=s.replace(a,'const META_FUNC_URL=SB_URL+"/functions/v1/rapid-processor";')
open("index-2026.11.03b.html","w",encoding="utf-8").write(s)
open(sys.argv[1]+"/c_n.mjs","w",encoding="utf-8").write(max(re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>',s,flags=re.S),key=len))

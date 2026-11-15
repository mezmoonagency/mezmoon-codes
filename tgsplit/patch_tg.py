import sys,re
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
def r(a,b,n=1):
    global s
    c=s.count(a); assert c==n,(c,a[:80]); s=s.replace(a,b)
# versiya
m=re.search(r'APP_VERSION\s*=\s*"2026\.11\.06h"',s); assert m
s=s.replace(m.group(0),m.group(0).replace("06h","08a"))
# 1) targetoloq scope
r('const scopeOf=()=>role==="account"?ACC_SCOPE:role==="pm"?PM_SCOPE:null;',
  'const scopeOf=()=>role==="account"?ACC_SCOPE:role==="pm"?PM_SCOPE:null;\n/* Targetoloq yalnız özünə təyin olunmuş (və hələ heç kimə təyin olunmamış) məkanları görür (CEO «Targeting bölgüsü»ndə təyin edir) */\nconst TG_SCOPE={clients:"name",ad_briefs:"client",ad_issues:"client",shoots:"client"};')
r('function applyAccScope(){\n',
  'function applyAccScope(){\n  if(role==="targeting"&&me){\n    Object.entries(TG_SCOPE).forEach(([t,k])=>{const rows=ACC_RAW[t]||state[t]||[];state[t]=rows.filter(r=>tgClientOk(r[k])||(r.created_by&&r.created_by===me.id)||(t==="ad_briefs"&&r.taken_by===me.id));});\n    return;}\n')
# 2) yoxlama funksiyası + bölgü pəncərəsi (PM bölgüsünün surəti)
a=s.find('function openPmSplit(){');b=s.find('function pmTaskOk(t)');assert a>0 and b>a
pm=s[a:b]
tg=pm
for x,y in [('openPmSplit','openTgSplit'),('p.role==="pm"','p.role==="targeting"'),('c.pm_id','c.tg_id'),('{pm_id:','{tg_id:'),
            ('👥 PM-lər arasında məkan bölgüsü','🎯 Targetoloqlar arasında məkan bölgüsü'),
            ('Hər PM tapşırıq, brif, kontent, iclas, hesabat, SMM, çatdırılma və videolarda <b>yalnız öz məkanlarını</b> görür. <b>Çəkiliş cədvəlində</b> isə bütün çəkilişlər hamıya görünür. Təyin olunmayan məkan bütün PM-lərə görünür.',
             'Hər targetoloq Targeting brifləri, Reklam analizi, Video rəyləri və xəbərdarlıqlarda <b>yalnız öz məkanlarını</b> görür; yeni brif bildirişi də yalnız ona gedir. Təyin olunmayan məkan bütün targetoloqlara görünür.'),
            ('Hələ «Project Manager» vəzifəsində işçi yoxdur','Hələ «Targetoloq» vəzifəsində işçi yoxdur'),
            ('#pmsum','#tgsum'),('id="pmsum"','id="tgsum"'),('#pmrows','#tgrows'),('id="pmrows"','id="tgrows"'),('#pmauto','#tgauto'),('id="pmauto"','id="tgauto"'),
            ('data-pmc','data-tgc'),('dataset.pmc','dataset.tgc'),('const pms=','const pms='),('məkanın PM-i yeniləndi','məkanın targetoloqu yeniləndi')]:
    assert x in tg,x; tg=tg.replace(x,y)
helper='/* Targetoloq məkan bölgüsü */\nfunction tgClientOk(name){if(role!=="targeting"||!name)return true;const c=allClients().find(x=>x.name===name);return !c||!c.tg_id||(me&&c.tg_id===me.id);}\n/* Brif bildirişi: məkanın targetoloqu varsa yalnız ona, yoxdursa bütün targetoloqlara */\nfunction abTgIds(client){const c=allClients().find(x=>x.name===client);const t=c&&c.tg_id&&state.profiles.find(p=>p.id===c.tg_id&&p.role==="targeting");return t?[t.id]:roleIds(["targeting"]);}\n'
s=s[:b]+helper+tg+s[b:]
# 3) bildirişlər
r('abNotify(b.taken_by?[b.taken_by]:roleIds(["targeting"]),','abNotify(b.taken_by?[b.taken_by]:abTgIds(b.client),')
r('abNotify(roleIds(["targeting"]),`🎯 ${client} - yeni reklam brifi var','abNotify(abTgIds(client),`🎯 ${client} - yeni reklam brifi var')
# 4) xəbərdarlıqlar
r('return state.ads_alerts.filter(a=>Date.parse(a.created_at)>=since)','return state.ads_alerts.filter(a=>Date.parse(a.created_at)>=since&&tgClientOk(a.client))')
# 5) düymələr (CEO): Klientlər və Targeting brifləri
r('pb.onclick=openPmSplit;actions.appendChild(pb);}',
  'pb.onclick=openPmSplit;actions.appendChild(pb);const tb=el("button","btn ghost","🎯 Targeting bölgüsü");tb.title="Məkanları targetoloqlar arasında bölüşdür";tb.onclick=openTgSplit;actions.appendChild(tb);}\n  if(view==="adbriefs"&&role==="ceo"){const tb=el("button","btn ghost","🎯 Targeting bölgüsü");tb.title="Məkanları targetoloqlar arasında bölüşdür";tb.onclick=openTgSplit;actions.appendChild(tb);}')
open(dst,"w").write(s)
print("ok")

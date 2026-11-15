import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src,encoding="utf-8").read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:80])
    s=s.replace(a,b)
rep('APP_VERSION="2026.11.06c"','APP_VERSION="2026.11.06d"')
rep('''    <label style="display:flex;gap:8px;align-items:center;font-size:13px;cursor:pointer;margin-bottom:10px"><input type="checkbox" id="s8"${e.as_story?" checked":""}> Story kimi paylaş</label>''','''    <div class="field" data-pf="instagram"><label>Instagram-da harada</label><div class="pchips" style="max-height:none"><button type="button" class="pchip" data-dest="feed">Lent (Reels / post)</button><button type="button" class="pchip" data-dest="story">Story</button><button type="button" class="pchip" data-dest="both">İkisi də</button></div><div class="hint" id="s-dest" style="white-space:normal;margin-top:6px"></div></div>''')
# state + handlers (after plats defined)
rep('''  const plats=new Set(Array.isArray(e.platforms)&&e.platforms.length?e.platforms:["instagram"]);''','''  const plats=new Set(Array.isArray(e.platforms)&&e.platforms.length?e.platforms:["instagram"]);
  let dest=e.as_story?"story":"feed";
  const drawDest=()=>{scrim.querySelectorAll("[data-dest]").forEach(x=>x.classList.toggle("on",x.dataset.dest===dest));
    q("#s-dest").textContent=dest==="both"?(isEdit?"Bu paylaşım lentə gedəcək, eyni material üçün ayrıca Story paylaşımı da yaradılacaq.":"Eyni material həm lentə, həm Story-yə gedəcək (iki ayrı paylaşım kimi yazılır)."):dest==="story"?"Story-də mətn görünmür və 24 saatdan sonra yox olur.":"";};
  scrim.querySelectorAll("[data-dest]").forEach(b=>b.onclick=()=>{dest=b.dataset.dest;drawDest();});
  drawDest();''')
rep('''    const asStory=q("#s8").checked;''','''    const asStory=dest==="story";const stories=plats.has("instagram")?(dest==="both"?[false,true]:[dest==="story"]):[false];''')
rep('''    if(pubMode==="auto"){const bad=smmAutoProblem(curM(),v,asStory);''','''    if(pubMode==="auto"){const bad=smmAutoProblem(curM(),v,asStory)||(dest==="both"?smmAutoProblem(curM(),v,true):"");''')
rep('''    if(isEdit){const k=[...kinds][0];const base=one(k);const moved=date!==e.post_date||base.post_time!==e.post_time;await upd('smm_posts',e.id,{...base,post_date:date,...(moved?{due_notified_at:null,miss_notified_at:null}:{})});}''','''    if(isEdit){const k=[...kinds][0];const base={...one(k),as_story:stories[0]};const moved=date!==e.post_date||base.post_time!==e.post_time;await upd('smm_posts',e.id,{...base,post_date:date,...(moved?{due_notified_at:null,miss_notified_at:null}:{})});
      if(stories.length>1){const {error}=await sb.from('smm_posts').insert({...one(k),post_date:date,as_story:true,caption_tt:"",platforms:["instagram"]});if(error)alert("Story paylaşımı yaradılmadı: "+error.message);await reload('smm_posts');}}''')
rep('''      const rows=[];dates.forEach(dt=>SMM_KINDS.forEach(([k])=>{if(kinds.has(k))rows.push({...one(k),post_date:dt});}));''','''      const rows=[];dates.forEach(dt=>SMM_KINDS.forEach(([k])=>{if(kinds.has(k))stories.forEach((st,si)=>rows.push({...one(k),post_date:dt,as_story:st,...(si>0?{caption_tt:"",platforms:["instagram"]}:{})}));}));''')
open(dst,"w",encoding="utf-8").write(s);print("ok")

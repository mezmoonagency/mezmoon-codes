import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
assert s.count('APP_VERSION="2026.11.09r"')==1
s=s.replace('APP_VERSION="2026.11.09r"','APP_VERSION="2026.11.09s"')

# feedBlank + items: ai_folder
s=s.replace('function feedBlank(){return {order:[],plan:{},covers:{},pal:[],extra:{},graded:{},gorig:{},ref_id:null,notes:{},status:"draft",note:""};}',
            'function feedBlank(){return {order:[],plan:{},covers:{},pal:[],extra:{},graded:{},gorig:{},ref_id:null,notes:{},ai_folder:null,status:"draft",note:""};}')
s=s.replace('const items={order:f.order,plan:f.plan,covers:f.covers,pal:f.pal,extra:f.extra,graded:f.graded,gorig:f.gorig,ref_id:f.ref_id,notes:f.notes};',
            'const items={order:f.order,plan:f.plan,covers:f.covers,pal:f.pal,extra:f.extra,graded:f.graded,gorig:f.gorig,ref_id:f.ref_id,notes:f.notes,ai_folder:f.ai_folder};')

# AI Feed papkası: driveOwnerUpload parent-i AI papkaya yönəlt (feedGradeOne + feedGradeSaveUrl, 2 yer)
pold='const parent=await editDriveParent(v.client);\n  const durl=await driveOwnerUpload(new File([blob],"ai-cover.png",{type:blob.type||"image/png"}),(v.client||"feed")+"-ai-cover.png",parent,()=>{});'
assert s.count(pold)==1, s.count(pold)
pnew='let parent=fd.ai_folder;if(!parent){parent=await feedEnsureAiFolder(v);fd.ai_folder=parent;feedSave();}\n  const durl=await driveOwnerUpload(new File([blob],"ai-cover.png",{type:blob.type||"image/png"}),(v.client||"feed")+"-ai-cover.png",parent,()=>{});'
s=s.replace(pold,pnew)

# feedEnsureAiFolder — feedGradeSaveUrl-dən əvvəl
helper=r'''async function feedEnsureAiFolder(v){
  const base=await editDriveParent(v.client);const token=await gToken();
  const q=encodeURIComponent("name='AI Feed' and mimeType='application/vnd.google-apps.folder' and '"+base+"' in parents and trashed=false");
  let r=await fetch("https://www.googleapis.com/drive/v3/files?q="+q+"&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true",{headers:{Authorization:"Bearer "+token}});
  let j=await r.json();if(j.files&&j.files.length)return j.files[0].id;
  r=await fetch("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({name:"AI Feed",mimeType:"application/vnd.google-apps.folder",parents:[base]})});
  j=await r.json();if(!j.id)throw new Error("AI Feed papkası yaradılmadı");return j.id;}
'''
s=s.replace('async function feedGradeSaveUrl(v,fd,id,url){',helper+'async function feedGradeSaveUrl(v,fd,id,url){',1)

# feedGradeModal və feedGradeLiveModal → feedGradeModal2 + nazik wrapperlər
GM=open("/tmp/gm.txt").read()
GLM=open("/tmp/glm.txt").read()
assert GM in s and GLM in s
MODAL2=r'''function feedGradeModal2(v,fd,posts,title){
  let refB64=null,refMime=null;const sel=new Set(posts.map(p=>p.id));
  const scrim=el("div","scrim");
  scrim.innerHTML='<div class="modal" style="max-width:600px"><div class="mh"><h3>'+esc(title)+'</h3><button data-x>×</button></div><div class="mb" id="gbody"><div class="hint" style="white-space:normal">Nümunə şəkli yüklə, sonra rəngləmək istədiyin postları seç (istədiyin qədər). Yalnız rəng dəyişir, məzmun saxlanılır. Yalnız «✓ Saxla» dediklərin Drive-dakı «AI Feed» papkasına gedir. Higgsfield krediti.</div><button class="btn" id="gref" style="width:100%;margin-top:10px">🖼 Nümunə şəkli seç</button><div id="gsel"></div><div id="gact"></div><div id="gres" style="margin-top:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px"></div></div></div>';
  document.body.appendChild(scrim);const close=()=>scrim.remove();scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const gsel=scrim.querySelector("#gsel"),act=scrim.querySelector("#gact"),gres=scrim.querySelector("#gres");
  function drawSel(){gsel.innerHTML='<div class="hint" style="margin:12px 0 6px">Rənglənəcək postları seç ('+sel.size+'/'+posts.length+') — toxun: seç/ləğv et</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:6px">'+posts.map((p,i)=>'<button type="button" data-si="'+i+'" style="padding:0;border:2px solid '+(sel.has(p.id)?"#34c38f":"transparent")+';border-radius:8px;overflow:hidden;cursor:pointer;background:#1a1a1a;aspect-ratio:3/4;position:relative;display:block;opacity:'+(sel.has(p.id)?"1":".45")+'"><img src="'+esc(p.thumb)+'" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;display:block"><span style="position:absolute;right:3px;top:3px;font-size:12px">'+(sel.has(p.id)?"✓":"")+'</span></button>').join("")+'</div>';
    gsel.querySelectorAll("[data-si]").forEach(b=>b.onclick=()=>{const p=posts[+b.dataset.si];if(sel.has(p.id))sel.delete(p.id);else sel.add(p.id);drawSel();updateRun();});}
  function updateRun(){const rb=act.querySelector("#grun");if(rb)rb.textContent="🎨 Seçilənləri rənglə ("+sel.size+")";}
  scrim.querySelector("#gref").onclick=async()=>{const files=await pickFiles("image/*");if(!files||!files.length)return;const img=await fLoad(URL.createObjectURL(files[0]));if(!img)return alert("Şəkil açılmadı");const b=feedImgB64(img);refB64=b.b64;refMime=b.mime;
    scrim.querySelector("#gref").textContent="✓ Nümunə seçildi — dəyişmək üçün yenidən bas";drawSel();
    act.innerHTML='<button class="btn" id="grun" style="width:100%;margin-top:10px">🎨 Seçilənləri rənglə ('+sel.size+')</button>';act.querySelector("#grun").onclick=run;};
  async function gradeOne(p){if(p.srcUrl)return await feedGradeCall({src_url:p.srcUrl,ref_b64:refB64,ref_mime:refMime,aspect:"3:4"});return await feedGradeRun(v,fd,p.id,refB64,refMime);}
  function wire(cell,id){const sv=cell.querySelector("[data-save]"),ag=cell.querySelector("[data-again]"),p=posts.find(x=>x.id===id);
    if(sv)sv.onclick=async(e)=>{const b=e.target;b.textContent="Saxlanılır…";b.disabled=true;try{await feedGradeSaveUrl(v,fd,id,cell.dataset.url);b.textContent="✓ saxlanıldı";render();}catch(err){alert(err.message||err);b.textContent="✓ Saxla";b.disabled=false;}};
    if(ag)ag.onclick=async(e)=>{const b=e.target;b.textContent="…";b.disabled=true;try{const u=await gradeOne(p);cell.dataset.url=u;cell.querySelector("img").src=u;const a=cell.querySelector("a");if(a)a.href=u;b.textContent="↻";b.disabled=false;const s2=cell.querySelector("[data-save]");if(s2){s2.textContent="✓ Saxla";s2.disabled=false;}}catch(err){alert(err.message||err);b.textContent="↻";b.disabled=false;}};}
  async function run(){
    if(!refB64)return alert("Əvvəlcə nümunə seç");const list=posts.filter(p=>sel.has(p.id));if(!list.length)return alert("Heç post seçilmədi");
    if(!driveConnected())return alert("Drive qoşulu olmalıdır (yuxarıdan «☁️ Drive-ı qoş»).");
    if(!confirm(list.length+" örtük rənglənəcək (hər biri kredit tutur). Yalnız «✓ Saxla» dediklərin Drive-dakı «AI Feed» papkasına qalacaq. Davam?"))return;
    const grun=act.querySelector("#grun");grun.disabled=true;
    for(let k=0;k<list.length;k++){const p=list[k];grun.textContent="Rənglənir… "+(k+1)+"/"+list.length;
      const cell=el("div");cell.style.cssText="border:1px solid var(--border);border-radius:8px;overflow:hidden";cell.innerHTML='<div class="hint" style="padding:8px">Rənglənir…</div>';gres.appendChild(cell);
      try{const url=await gradeOne(p);cell.dataset.url=url;
        cell.innerHTML='<img src="'+esc(url)+'" referrerpolicy="no-referrer" style="width:100%;aspect-ratio:3/4;object-fit:cover;display:block"><div style="display:flex;gap:5px;flex-wrap:wrap;padding:6px 7px"><button class="btn sm" data-save style="flex:1">✓ Saxla</button><button class="btn ghost sm" data-again title="Yenidən">↻</button><a class="btn ghost sm" href="'+esc(url)+'" download="cover.png" target="_blank">⬇︎</a></div>';
        wire(cell,p.id);
      }catch(e){cell.innerHTML='<div class="empty" style="padding:8px">'+esc(e.message||String(e))+'</div>';}
    }
    grun.textContent="✓ Bitdi — bəyəndiklərini «✓ Saxla» et";grun.disabled=false;
  }}
function feedGradeModal(v,fd){const lib=smmLibrary(v).filter(m=>m.drive_id);const byId={};lib.forEach(m=>byId[m.drive_id]=m);if(fd.extra)Object.keys(fd.extra).forEach(id=>{if(!byId[id])byId[id]=fd.extra[id];});const ord=(fd.order||[]).slice(0,9);if(!ord.length)return alert("Feed boşdur");const posts=ord.map(id=>({id,thumb:feedCoverSrc(id,fd)}));feedGradeModal2(v,fd,posts,"🎨 AI rəng");}'''
s=s.replace(GM,MODAL2)
GLM_NEW=r'''function feedGradeLiveModal(v,fd,media){const posts=(media||[]).slice(0,12).map(m=>({id:m.id,thumb:feedLiveCoverSrc(m,fd),srcUrl:feedLiveCoverSrc(m,fd)}));if(!posts.length)return alert("Feed boşdur");feedGradeModal2(v,fd,posts,"🎨 AI rəng — Hazırkı feed");}'''
s=s.replace(GLM,GLM_NEW)

# tarixçə başlığı + canlı feed-ə əlavə
s=s.replace("🎨 AI rəng nəticələri (","🎨 AI feed tarixçəsi (")
livehint='box.appendChild(el("div","hint","Məkanın hazırkı Instagram feed-i (son postlar). Video örtüyü API-dən ilk kadr kimi gəlir — «🖼 örtük» ilə düzgün şəkli təyin et. Posta klik — Instagram-da açılır."));'
assert s.count(livehint)==1
s=s.replace(livehint,livehint+'feedGradedSection(box,v,fd);feedNotesList(box,fd,(FEEDLIVE[v.client]&&FEEDLIVE[v.client].media||[]).map(m=>m.id));')

open(dst,"w").write(s)
print("ok bytes:",len(s))

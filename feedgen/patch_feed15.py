# 09k -> 09l: Higgsfield ilə örtükləri referansa uyğun YALNIZ rəngləyən panel axını (ig-grade)
import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
assert s.count('APP_VERSION="2026.11.09k"')==1
s=s.replace('APP_VERSION="2026.11.09k"','APP_VERSION="2026.11.09l"')

GRADE=r'''function feedAspect(w,h){const r=w/h,c=[["9:16",9/16],["3:4",3/4],["2:3",2/3],["1:1",1],["4:3",4/3],["16:9",16/9]];let best=c[0];c.forEach(x=>{if(Math.abs(x[1]-r)<Math.abs(best[1]-r))best=x;});return best[0];}
function feedImgB64(img){const mx=1024;let w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;const sc=Math.min(1,mx/Math.max(w,h));w=Math.round(w*sc);h=Math.round(h*sc);const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);const url=c.toDataURL("image/jpeg",0.9);return {b64:url.split(",")[1],mime:"image/jpeg",aspect:feedAspect(w,h)};}
async function feedGradeCall(payload){const {data:{session}}=await sb.auth.getSession();const auth="Bearer "+(session?session.access_token:"");
  const r=await fetch(SB_URL+"/functions/v1/ig-grade",{method:"POST",headers:{"Content-Type":"application/json",apikey:SB_KEY,Authorization:auth},body:JSON.stringify(Object.assign({action:"start"},payload))});
  const j=await r.json();if(!j.ok)throw new Error(j.error||"Başlamadı");const rid=j.rid;
  for(let i=0;i<45;i++){await new Promise(x=>setTimeout(x,4000));
    const p=await fetch(SB_URL+"/functions/v1/ig-grade",{method:"POST",headers:{"Content-Type":"application/json",apikey:SB_KEY,Authorization:auth},body:JSON.stringify({action:"poll",rid})});
    const pj=await p.json();if(!pj.ok)throw new Error(pj.error||"xəta");if(pj.status==="completed")return pj.url;if(pj.status==="failed")throw new Error(pj.error||"Alınmadı");}
  throw new Error("Çox uzun çəkdi");}
function feedGradeModal(v,fd){
  const lib=smmLibrary(v).filter(m=>m.drive_id);const byId={};lib.forEach(m=>byId[m.drive_id]=m);if(fd.extra)Object.keys(fd.extra).forEach(id=>{if(!byId[id])byId[id]=fd.extra[id];});
  const ord=(fd.order||[]).slice(0,9);let refB64=null,refMime=null;
  const scrim=el("div","scrim");
  scrim.innerHTML='<div class="modal" style="max-width:640px"><div class="mh"><h3>🎨 AI rəng (Higgsfield)</h3><button data-x>×</button></div><div class="mb" id="gbody"><div class="hint" style="white-space:normal">Nümunə feed/konsept şəklini yüklə — sistem hər örtüyü həmin rəng tonuna uyğunlaşdıracaq. Yalnız rəng dəyişir, məzmun (mövzu, kompozisiya, detallar) saxlanılır. Higgsfield krediti xərclənir.</div><button class="btn" id="gref" style="width:100%;margin-top:10px">🖼 Nümunə şəkli seç</button><div id="gact"></div><div id="gres" style="margin-top:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px"></div></div></div>';
  document.body.appendChild(scrim);const close=()=>scrim.remove();scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const act=scrim.querySelector("#gact"),res=scrim.querySelector("#gres");
  scrim.querySelector("#gref").onclick=async()=>{const files=await pickFiles("image/*");if(!files||!files.length)return;const img=await fLoad(URL.createObjectURL(files[0]));if(!img){alert("Şəkil açılmadı");return;}const b=feedImgB64(img);refB64=b.b64;refMime=b.mime;
    scrim.querySelector("#gref").textContent="✓ Nümunə seçildi — dəyişmək üçün yenidən bas";
    act.innerHTML='<button class="btn" id="grun" style="width:100%;margin-top:10px">🎨 '+ord.length+' örtüyü rənglə</button>';
    act.querySelector("#grun").onclick=run;};
  async function run(){
    if(!refB64)return alert("Əvvəlcə nümunə seç");if(!ord.length)return alert("Feed boşdur");
    if(!confirm(ord.length+" örtük Higgsfield ilə rənglənəcək (hər biri kredit tutur). Davam edilsin?"))return;
    res.innerHTML="";const grun=act.querySelector("#grun");grun.disabled=true;
    for(let k=0;k<ord.length;k++){const id=ord[k];grun.textContent="Rənglənir… "+(k+1)+"/"+ord.length;
      const cell=el("div");cell.style.cssText="border:1px solid var(--border);border-radius:8px;overflow:hidden";cell.innerHTML='<div class="hint" style="padding:8px">Post '+(k+1)+' — hazırlanır…</div>';res.appendChild(cell);
      try{
        const ci=feedCoverId(id,fd);const srcImg=ci.d?await fLoad(ci.d):await fLoadDrive(ci.id);if(!srcImg)throw new Error("şəkil oxunmadı");
        const sbi=feedImgB64(srcImg);
        const url=await feedGradeCall({src_b64:sbi.b64,src_mime:sbi.mime,ref_b64:refB64,ref_mime:refMime,aspect:sbi.aspect});
        cell.innerHTML='<img src="'+esc(url)+'" referrerpolicy="no-referrer" style="width:100%;aspect-ratio:3/4;object-fit:cover;display:block"><div style="display:flex;gap:6px;padding:7px"><button class="btn sm" data-save style="flex:1">örtük et</button><a class="btn ghost sm" href="'+esc(url)+'" download="cover'+(k+1)+'.png" target="_blank">endir</a></div>';
        cell.querySelector("[data-save]").onclick=async(e)=>{const btn=e.target;btn.textContent="Yüklənir…";btn.disabled=true;
          try{const blob=await (await fetch(url)).blob();const parent=await editDriveParent(v.client);const durl=await driveOwnerUpload(new File([blob],"feed-cover.png",{type:blob.type||"image/png"}),(v.client||"feed")+"-cover.png",parent,()=>{});const did=driveId(durl);if(did){fd.covers[id]=did;feedSave();btn.textContent="✓ örtük təyin olundu";}else{btn.textContent="Drive xəta";btn.disabled=false;}}
          catch(err){alert("Drive-a yüklənmədi: "+(err.message||err));btn.textContent="örtük et";btn.disabled=false;}};
      }catch(e){cell.innerHTML='<div class="empty" style="padding:8px">Post '+(k+1)+': '+esc(e.message||String(e))+'</div>';}
    }
    grun.textContent="✓ Bitdi — nəticələrə bax";grun.disabled=false;
  }}
'''
anchor='function feedPlanBody(box,v,fd){'
assert s.count(anchor)==1
s=s.replace(anchor,GRADE+anchor,1)

# yan paneldə düymə (konsept düyməsindən sonra)
btn='{const cbtn=el("button","btn ghost","🎚 Konseptdən stil + LUT");cbtn.style.width="100%";cbtn.onclick=()=>feedConceptModal(v,fd);side.appendChild(cbtn);}'
assert s.count(btn)==1
s=s.replace(btn,btn+'\n  {const gbtn=el("button","btn ghost","🎨 AI rəng (Higgsfield)");gbtn.style.width="100%";gbtn.onclick=()=>feedGradeModal(v,fd);side.appendChild(gbtn);}')

open(dst,"w").write(s)
print("ok bytes:",len(s))

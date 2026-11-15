# 09j -> 09k: Konseptdən stil + LUT (.cube) yaradan sistem
import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
assert s.count('APP_VERSION="2026.11.09j"')==1
s=s.replace('APP_VERSION="2026.11.09j"','APP_VERSION="2026.11.09k"')

CONCEPT=r'''function fLab2rgb(L,a,b){
  let y=(L+16)/116,x=a/500+y,z=y-b/200;const f=t=>{const t3=t*t*t;return t3>0.008856?t3:(t-16/116)/7.787;};
  x=0.95047*f(x);y=1.0*f(y);z=1.08883*f(z);
  let r=x*3.2406+y*-1.5372+z*-0.4986,g=x*-0.9689+y*1.8758+z*0.0415,bb=x*0.0557+y*-0.2040+z*1.0570;
  const gam=c=>{c=c<=0.0031308?12.92*c:1.055*Math.pow(Math.max(0,c),1/2.4)-0.055;return Math.min(1,Math.max(0,c));};
  return [gam(r),gam(g),gam(bb)];}
function feedRefStats(img){const W=64,H=64;FCV.width=W;FCV.height=H;FCX.drawImage(img,0,0,W,H);let d;try{d=FCX.getImageData(0,0,W,H).data;}catch(e){d=null;}
  let sA=[0,0,0],sB=[0,0,0],cN=[0,0,0],Lsum=0,Lsq=0,Csum=0,tot=0;
  if(d)for(let i=0;i<d.length;i+=4){const lab=fRgb2lab(d[i],d[i+1],d[i+2]);const L=lab[0],z=L<33?0:L<66?1:2;sA[z]+=lab[1];sB[z]+=lab[2];cN[z]++;Lsum+=L;Lsq+=L*L;Csum+=Math.sqrt(lab[1]*lab[1]+lab[2]*lab[2]);tot++;}
  const zc=z=>cN[z]?[sA[z]/cN[z],sB[z]/cN[z]]:[0,0];
  const meanL=tot?Lsum/tot:50,Lstd=tot?Math.sqrt(Math.max(0,Lsq/tot-meanL*meanL)):20,meanC=tot?Csum/tot:15;
  return {sh:zc(0),mid:zc(1),hi:zc(2),meanL,Lstd,meanC,pal:fDominants(img,5)||[]};}
function feedGradeFn(st){const cfac=Math.min(1.3,Math.max(0.85,st.Lstd/24)),sat=Math.min(1.6,Math.max(0.7,st.meanC/18)),amt=0.6;
  return (r,g,b)=>{const lab=fRgb2lab(r,g,b);let L=lab[0];const A=lab[1],B=lab[2];const wS=Math.min(1,Math.max(0,(40-L)/40)),wH=Math.min(1,Math.max(0,(L-60)/40)),wM=Math.max(0,1-wS-wH);
    L=50+(L-50)*cfac+(st.meanL-50)*0.3;L=Math.min(100,Math.max(0,L));
    const na=A*sat+(st.sh[0]*wS+st.mid[0]*wM+st.hi[0]*wH)*amt,nb=B*sat+(st.sh[1]*wS+st.mid[1]*wM+st.hi[1]*wH)*amt;
    const o=fLab2rgb(L,na,nb);return [Math.round(o[0]*255),Math.round(o[1]*255),Math.round(o[2]*255)];};}
function feedBuildLUT(st,name){const N=17,fn=feedGradeFn(st),out=['TITLE "'+String(name).replace(/"/g,"")+'"',"LUT_3D_SIZE "+N,""];
  for(let b=0;b<N;b++)for(let g=0;g<N;g++)for(let r=0;r<N;r++){const o=fn(r/(N-1)*255,g/(N-1)*255,b/(N-1)*255);out.push((o[0]/255).toFixed(5)+" "+(o[1]/255).toFixed(5)+" "+(o[2]/255).toFixed(5));}
  return out.join("\n");}
function feedStyleText(st){const warm=(st.mid[1]+st.hi[1])>6?"isti ton":(st.mid[1]+st.hi[1])<-6?"soyuq ton":"neytral ton";const tone=(st.sh[0]+st.mid[0])>7?"qırmızımtıl":(st.sh[0]+st.mid[0])<-7?"yaşılımtıl":"";const con=st.Lstd>26?"yüksək kontrast":st.Lstd<14?"yumşaq, az kontrast":"orta kontrast";const sat=st.meanC>30?"doymuş canlı rənglər":st.meanC<14?"solğun matə tonlar":"balanslı doyğunluq";const br=st.meanL>60?"işıqlı":st.meanL<40?"tünd":"orta işıqlı";
  return [warm,tone,con,sat,br].filter(Boolean).join(" · ");}
function feedApplyPreview(img,st){const W=180,H=240,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
  const vw=img.naturalWidth||img.width,vh=img.naturalHeight||img.height,tr=W/H,sr=vw/vh;let sw,sh,sx,sy;if(sr>tr){sh=vh;sw=vh*tr;sx=(vw-sw)/2;sy=0;}else{sw=vw;sh=vw/tr;sx=0;sy=(vh-sh)/2;}
  g.drawImage(img,sx,sy,sw,sh,0,0,W,H);
  if(st){try{const im=g.getImageData(0,0,W,H),px=im.data,fn=feedGradeFn(st);for(let i=0;i<px.length;i+=4){const o=fn(px[i],px[i+1],px[i+2]);px[i]=o[0];px[i+1]=o[1];px[i+2]=o[2];}g.putImageData(im,0,0);}catch(e){}}
  return c.toDataURL("image/jpeg",0.85);}
function feedConceptModal(v,fd){
  const scrim=el("div","scrim");
  scrim.innerHTML='<div class="modal" style="max-width:560px"><div class="mh"><h3>🎚 Konseptdən stil + LUT</h3><button data-x>×</button></div><div class="mb" id="cbody"><div class="hint" style="white-space:normal">Nümunə/konsept şəklini yüklə — sistem palitranı və stilistikanı çıxaracaq, həmin görünüşə uyğun LUT (.cube) yaradacaq (CapCut/Premiere/DaVinci-də videolara tətbiq et) və sənin şəklinə əvvəl/sonra önizləmə göstərəcək.</div><button class="btn" id="cup" style="width:100%;margin-top:10px">🖼 Konsept şəkli seç</button></div></div>';
  document.body.appendChild(scrim);const close=()=>scrim.remove();scrim.querySelector("[data-x]").onclick=close;scrim.onclick=e=>{if(e.target===scrim)close();};
  const body=scrim.querySelector("#cbody");
  scrim.querySelector("#cup").onclick=async()=>{
    const files=await pickFiles("image/*");if(!files||!files.length)return;
    body.innerHTML='<div class="hint">Analiz edilir…</div>';
    const img=await fLoad(URL.createObjectURL(files[0]));
    if(!img){body.innerHTML='<div class="empty">Şəkil açılmadı.</div>';return;}
    const st=feedRefStats(img),pal=(st.pal||[]).map(d=>[Math.round(d.rgb[0]),Math.round(d.rgb[1]),Math.round(d.rgb[2])]);
    body.innerHTML='<div style="display:flex;gap:14px;flex-wrap:wrap"><img src="'+img.src+'" style="width:120px;border-radius:10px;flex:none"><div style="flex:1;min-width:180px"><div style="font-weight:600;margin-bottom:6px">Stil</div><div class="hint" style="white-space:normal;margin:0">'+esc(feedStyleText(st))+'</div></div></div><div style="font-weight:600;margin:12px 0 6px">Palitra</div><div id="cpal" style="display:flex;gap:8px;flex-wrap:wrap"></div><div id="cprev" style="margin-top:12px"></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn" id="clut">⬇︎ LUT (.cube) yarat və endir</button><button class="btn ghost" id="cset">🎨 Palitranı feed-ə təyin et</button></div>';
    const cp=body.querySelector("#cpal");pal.forEach(c=>{const sw=el("span");sw.style.cssText="width:34px;height:34px;border-radius:8px;border:1px solid rgba(0,0,0,.3);background:rgb("+c[0]+","+c[1]+","+c[2]+")";cp.appendChild(sw);});
    body.querySelector("#cset").onclick=()=>{fd.pal=pal;feedSave();close();render();};
    body.querySelector("#clut").onclick=()=>{const cube=feedBuildLUT(st,(v.client||"feed")+"-concept");const blob=new Blob([cube],{type:"text/plain"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=String(v.client||"feed").replace(/[^a-z0-9]+/gi,"_")+"_concept.cube";document.body.appendChild(a);a.click();a.remove();};
    const srcId=(fd.order||[]).find(Boolean);
    if(srcId){const prev=body.querySelector("#cprev");prev.innerHTML='<div class="hint">Önizləmə hazırlanır…</div>';
      const sImg=await fLoadDrive(srcId);
      if(sImg){prev.innerHTML='<div style="font-weight:600;margin-bottom:6px">Sənin şəklin: əvvəl → sonra</div><div style="display:flex;gap:8px"><img src="'+feedApplyPreview(sImg,null)+'" style="width:48%;border-radius:8px"><img src="'+feedApplyPreview(sImg,st)+'" style="width:48%;border-radius:8px"></div>';}
      else prev.innerHTML='<div class="hint" style="white-space:normal">Önizləmə üçün feed-dəki şəkil oxunmadı (Drive qoşulu olmalıdır). LUT yenə yaradılır.</div>';
    }
  };}
'''
anchor='function feedPlanBody(box,v,fd){'
assert s.count(anchor)==1
s=s.replace(anchor,CONCEPT+anchor)

# yan paneldə düymə + köhnə qeydi yenilə (feed artıq bazadadır)
btn_anchor='side.appendChild(el("div","hint","Qeyd: feed düzülüşü, örtüklər və palitra hələ yalnız bu brauzerdə saxlanılır. Bütün komanda eyni görsün deyə bazaya sütun əlavə edə bilərik."));'
assert s.count(btn_anchor)==1
repl='{const cbtn=el("button","btn ghost","🎚 Konseptdən stil + LUT");cbtn.style.width="100%";cbtn.onclick=()=>feedConceptModal(v,fd);side.appendChild(cbtn);}\n  side.appendChild(el("div","hint","Feed düzülüşü, örtüklər və palitra bazada saxlanılır — bütün komanda eyni görür."));'
s=s.replace(btn_anchor,repl)

open(dst,"w").write(s)
print("ok bytes:",len(s))

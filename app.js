(() => {
"use strict";
const score=window.V4_SCORE,TOTAL=score.duration,flat=score.movements.flatMap(m=>m.scenes);
const canvas=document.querySelector('#film'),ctx=canvas.getContext('2d',{alpha:false}),entry=document.querySelector('#entry'),enter=document.querySelector('#enter'),load=document.querySelector('#load'),end=document.querySelector('#end'),replay=document.querySelector('#replay'),playBtn=document.querySelector('#play'),soundBtn=document.querySelector('#sound'),heartbeat=document.querySelector('#heartbeat'),clock=document.querySelector('#clock'),prog=document.querySelector('#progress span'),debugEl=document.querySelector('#debug');
const qs=new URLSearchParams(location.search),debug=qs.get('debug')==='1';if(debug)document.body.classList.add('debug');
let DPR=1,W=0,H=0,imgs=[],started=false,paused=false,ended=false,t=0,startStamp=0,raf=0,uiTimer=0,soundOn=true,audioStarted=false;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),lerp=(a,b,p)=>a+(b-a)*p,smooth=p=>{p=clamp(p);return p*p*(3-2*p)},cubic=p=>{p=clamp(p);return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2},fmt=s=>{s=Math.max(0,Math.floor(s));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};
function resize(){DPR=Math.min(1.5,devicePixelRatio||1);W=innerWidth;H=innerHeight;canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);if(started)render(t)}addEventListener('resize',resize,{passive:true});resize();
const image=id=>imgs[id-1],rect=(x=0,y=0,w=W,h=H)=>({x,y,w,h}),rr=(r,p)=>({x:r.x+p,y:r.y+p,w:r.w-2*p,h:r.h-2*p});
function coverGeom(im,r,zoom=1,cx=.5,cy=.5){const s=Math.max(r.w/im.naturalWidth,r.h/im.naturalHeight)*zoom,w=im.naturalWidth*s,h=im.naturalHeight*s;return{x:r.x+r.w/2-w*cx,y:r.y+r.h/2-h*cy,w,h}}
function drawCover(im,r,opt={}){if(!im)return;ctx.save();ctx.globalAlpha=opt.a==null?1:opt.a;ctx.globalCompositeOperation=opt.blend||'source-over';if(opt.filter)ctx.filter=opt.filter;if(opt.clip){ctx.beginPath();opt.clip(ctx,r);ctx.clip()}const g=coverGeom(im,r,opt.zoom||1,opt.cx==null?.5:opt.cx,opt.cy==null?.5:opt.cy);ctx.drawImage(im,g.x+(opt.dx||0),g.y+(opt.dy||0),g.w,g.h);ctx.restore()}
function drawContain(im,r,opt={}){if(!im)return;ctx.save();ctx.globalAlpha=opt.a==null?1:opt.a;ctx.globalCompositeOperation=opt.blend||'source-over';if(opt.filter)ctx.filter=opt.filter;const s=Math.min(r.w/im.naturalWidth,r.h/im.naturalHeight)*(opt.zoom||1),w=im.naturalWidth*s,h=im.naturalHeight*s,x=r.x+(r.w-w)/2+(opt.dx||0),y=r.y+(r.h-h)/2+(opt.dy||0);ctx.drawImage(im,x,y,w,h);ctx.restore()}
function drawCameraContain(im,r,opt={}){if(!im)return;ctx.save();ctx.globalAlpha=opt.a==null?1:opt.a;ctx.globalCompositeOperation=opt.blend||'source-over';if(opt.filter)ctx.filter=opt.filter;const z=opt.zoom||1,cx=opt.cx==null?.5:opt.cx,cy=opt.cy==null?.5:opt.cy,s=Math.min(r.w/im.naturalWidth,r.h/im.naturalHeight)*z,w=im.naturalWidth*s,h=im.naturalHeight*s,x=r.x+r.w/2-w*cx,y=r.y+r.h/2-h*cy;ctx.drawImage(im,x,y,w,h);ctx.restore()}
function drawCropContain(im,crop,r,opt={}){if(!im)return;ctx.save();ctx.globalAlpha=opt.a==null?1:opt.a;const sx=im.naturalWidth*crop.x,sy=im.naturalHeight*crop.y,sw=im.naturalWidth*crop.w,sh=im.naturalHeight*crop.h,s=Math.min(r.w/sw,r.h/sh),w=sw*s,h=sh*s,x=r.x+(r.w-w)/2,y=r.y+(r.h-h)/2;ctx.drawImage(im,sx,sy,sw,sh,x,y,w,h);ctx.restore()}

const circleClip=(px,py,rad)=>(c,r)=>c.arc(r.x+r.w*px,r.y+r.h*py,Math.min(r.w,r.h)*rad,0,Math.PI*2);
function seedRects(seed,n){let x=(seed*9301+49297)%233280,o=[];for(let i=0;i<n;i++){x=(x*9301+49297)%233280;let a=x/233280;x=(x*9301+49297)%233280;o.push([a,x/233280])}return o}
function drawScene(sc,p){ctx.fillStyle='#050505';ctx.fillRect(0,0,W,H);const I=sc.images.map(image),R=rect(),stage=(a,b)=>smooth((p-a)/(b-a));switch(sc.mode){
case'aperture':{drawCover(I[0],R,{zoom:1.03});let a=stage(.12,.45);drawCover(I[1],R,{a,clip:(c,r)=>c.rect(r.x+r.w*(.17-.08*a),r.y+r.h*.1,r.w*(.36+.14*a),r.h*.8)});let b=stage(.35,.7);drawCover(I[2],R,{a:b,clip:(c,r)=>c.rect(r.x+r.w*(.56-.08*b),r.y+r.h*(.22-.06*b),r.w*(.25+.18*b),r.h*(.56+.12*b))});let d=stage(.62,.96);drawCover(I[3],R,{a:d*.9,clip:circleClip(.5,.5,.08+.58*d)});break}
case'facade':{drawCover(I[0],R,{zoom:1.02});let ps=[stage(.1,.35),stage(.3,.58),stage(.54,.82)],rs=[{x:W*.05,y:H*.12,w:W*.42,h:H*.76},{x:W*.5,y:H*.08,w:W*.45,h:H*.4},{x:W*.5,y:H*.51,w:W*.45,h:H*.41}];for(let k=0;k<3;k++){let r=rs[k],a=ps[k];ctx.save();ctx.beginPath();ctx.rect(r.x,r.y,r.w*a,r.h);ctx.clip();drawCover(I[k+1],r,{a:.95});ctx.restore()}break}
case'facade_gdw':{
  // V4.1.3: GdW-1 remains a mirror-pillar landscape. The face is readable
  // inside that structure, not isolated as a portrait.
  const q0=clamp(p/.60);
  drawCover(I[0],R,{zoom:1.02});
  let ps=[smooth((q0-.08)/.28),smooth((q0-.30)/.28),smooth((q0-.50)/.30)],rs=[{x:W*.05,y:H*.12,w:W*.42,h:H*.76},{x:W*.5,y:H*.08,w:W*.45,h:H*.4},{x:W*.5,y:H*.51,w:W*.45,h:H*.41}];
  for(let k=0;k<3;k++){let r=rs[k],a=ps[k];ctx.save();ctx.beginPath();ctx.rect(r.x,r.y,r.w*a,r.h);ctx.clip();drawCover(I[k+1],r,{a:.95});ctx.restore()}
  if(p>=.60&&p<.74){
    const q=cubic((p-.60)/.14);
    ctx.fillStyle=`rgba(5,5,5,${q*.26})`;ctx.fillRect(0,0,W,H);
    drawContain(I[3],R,{a:q});
  }else if(p>=.74&&p<.91){
    const q=cubic((p-.74)/.17);
    drawCameraContain(I[3],R,{zoom:lerp(1,1.25,q),cx:lerp(.5,.60,q),cy:lerp(.5,.27,q)});
  }else if(p>=.91){
    drawCameraContain(I[3],R,{zoom:1.25,cx:.60,cy:.27});
  }
  break}
case'corridor':{drawCover(I[0],R,{zoom:1.04});[.14,.27,.4].forEach((s,k)=>{let a=stage(s,s+.28),pad=lerp(Math.min(W,H)*.28,Math.min(W,H)*(.125-.025*k),a);drawCover(I[k+1],rr(R,pad),{a,zoom:1.04})});break}
case'page_figure':{
  drawCover(I[0],R,{zoom:1.02,cx:.45,filter:'brightness(.82)'});
  let a=stage(.10,.28);
  if(a>0){ctx.fillStyle=`rgba(5,5,5,${a*.42})`;ctx.fillRect(0,0,W,H);drawContain(I[1],R,{a});}
  let b=stage(.42,.68);
  if(b>0){
    drawContain(I[1],R,{a:1});
    const r={x:W*.39,y:H*.045,w:W*.57,h:H*.91};
    drawCropContain(I[1],{x:.47,y:0,w:.53,h:1},r,{a:b});
    ctx.fillStyle=`rgba(5,5,5,${b*.26})`;ctx.fillRect(0,0,W*.37,H);
  }
  let d=stage(.76,.97);
  if(d>0)drawCover(I[2],{x:W*.035,y:H*.68,w:W*.31,h:H*.27},{a:d*.72,filter:'brightness(.85)'});
  break}

case'page':{drawCover(I[0],R,{zoom:1.02,cx:.45});for(let k=1;k<4;k++){let a=stage(.16*k,.16*k+.3),x=W*(.08+.23*(k-1)),w=W*.26*a;ctx.save();ctx.beginPath();ctx.rect(x,H*.08,w,H*.84);ctx.clip();drawCover(I[k],{x,y:H*.08,w:W*.26,h:H*.84},{a:.96,cx:.48});ctx.restore()}break}
case'magnify_mural':{
  drawCover(I[0],R,{zoom:1.02,filter:'brightness(.78)'});
  let a=stage(.10,.34); if(a>0)drawCover(I[1],R,{a:a*.66,clip:circleClip(.32,.48,.12+.28*a),zoom:1.05});
  let b=stage(.26,.52); if(b>0)drawCover(I[2],R,{a:b*.72,clip:circleClip(.63,.48,.13+.30*b),zoom:1.04});
  let d=stage(.48,.66);
  if(d>0){ctx.fillStyle=`rgba(5,5,5,${d*.42})`;ctx.fillRect(0,0,W,H);drawContain(I[3],R,{a:d});}
  let e=stage(.68,.98);
  if(e>0){
    const z=lerp(1,1.58,cubic(e)),cx=lerp(.5,.50,cubic(e)),cy=lerp(.5,.27,cubic(e));
    drawCameraContain(I[3],R,{a:1,zoom:z,cx,cy});
  }
  break}

case'magnify':{drawCover(I[0],R,{zoom:1.02});[[.26,.48,.12],[.52,.45,.16],[.7,.52,.21]].forEach((d,j)=>{let k=j+1,a=stage(.12+.2*k,.42+.18*k);drawCover(I[k],R,{a,zoom:lerp(1.08,1,a),clip:circleClip(d[0],d[1],d[2]+.32*a)})});break}
case'archive':{drawCover(I[0],R,{a:.55,filter:'brightness(.72)'});let tr=[{x:W*.05,y:H*.08,w:W*.42,h:H*.4},{x:W*.53,y:H*.08,w:W*.42,h:H*.4},{x:W*.19,y:H*.52,w:W*.62,h:H*.4}];for(let k=1;k<4;k++){let a=stage(.12+.18*k,.42+.18*k),r=tr[k-1];drawCover(I[k],{...r,y:r.y+lerp(H*.14,0,a)},{a,zoom:1.02})}break}
case'mirror':{drawCover(I[0],R,{a:.65});let a=stage(.15,.48);drawCover(I[1],{x:0,y:0,w:W*.5,h:H},{a});drawCover(I[2],{x:W*.5,y:0,w:W*.5,h:H},{a});let b=stage(.52,.88);drawCover(I[3],{x:W*.34,y:H*.08,w:W*.32,h:H*.84},{a:b,zoom:1.05});break}
case'ice':{drawCover(I[0],R,{zoom:1.03});let a=stage(.18,.5);drawCover(I[1],R,{a:a*.7,blend:'screen',filter:`grayscale(${1-a*.2})`});let b=stage(.42,.72);drawCover(I[2],{x:W*.08,y:H*.1,w:W*.5,h:H*.8},{a:b*.9});let d=stage(.68,.95);drawCover(I[3],R,{a:d*.78,blend:'screen',filter:`blur(${lerp(7,0,d)}px)`});break}
case'window':{drawCover(I[0],R,{a:.7,filter:'brightness(.72)'});[[.05,.12,.43,.34],[.52,.12,.43,.34],[.2,.52,.6,.35]].forEach((b,j)=>{let k=j+1,a=stage(.12+.2*k,.42+.2*k);drawCover(I[k],{x:W*b[0],y:H*b[1],w:W*b[2],h:H*b[3]},{a,zoom:1.03})});break}
case'organic_oase':{
  // V4.1.3: "Oase" stays legible as an accidental comment inside the
  // surrounding concrete landscape. No isolated sign close-up.
  if(p<.62){
    const q=clamp(p/.62);
    drawCover(I[0],R,{zoom:1.03});
    [[.26,.44,.12],[.53,.46,.18],[.72,.5,.23]].forEach((d,j)=>{let k=j+1,a=smooth((q-(.18+.18*k))/.30);drawCover(I[k],R,{a,clip:circleClip(d[0],d[1],d[2]+.28*a),zoom:1.04})});
  }else if(p<.76){
    const q=cubic((p-.62)/.14);
    drawCover(I[0],R,{zoom:lerp(1.00,1.02,q),cx:lerp(.50,.495,q),cy:lerp(.50,.58,q)});
  }else if(p<.92){
    const q=cubic((p-.76)/.16);
    drawCover(I[0],R,{zoom:lerp(1.02,1.04,q),cx:lerp(.495,.49,q),cy:lerp(.58,.64,q)});
  }else{
    drawCover(I[0],R,{zoom:1.04,cx:.49,cy:.64});
  }
  break}
case'organic':{drawCover(I[0],R,{zoom:1.03});[[.26,.44,.12],[.53,.46,.18],[.72,.5,.23]].forEach((d,j)=>{let k=j+1,a=stage(.12+.2*k,.42+.2*k);drawCover(I[k],R,{a,clip:circleClip(d[0],d[1],d[2]+.28*a),zoom:1.04})});break}
case'lens':{drawCover(I[0],R,{zoom:1.03});for(let k=1;k<4;k++){let a=stage(.1+.22*k,.38+.2*k),rad=.06+.12*k+.28*a;drawCover(I[k],R,{a,clip:circleClip(.5,.5,rad),zoom:lerp(1.12,1.01,a)})}break}
case'erosion':{drawCover(I[0],R,{filter:'brightness(.82)'});let pts=seedRects(sc.index,42);for(let k=1;k<4;k++){let a=stage(.1+.22*k,.44+.2*k);ctx.save();ctx.beginPath();for(let j=0;j<Math.floor(pts.length*a);j++){let [x,y]=pts[j];ctx.rect(x*W,y*H,W*.18,H*.16)}ctx.clip();drawCover(I[k],R,{a:.95});ctx.restore()}break}
case'ploetzensee':{
  const im=I[0];
  let z=1,cx=.5,cy=.5;
  if(p<.24){
    // Establish the whole memorial site.
    z=1;cx=.5;cy=.5;
  }else if(p<.46){
    // Quietly approach the portrait photographs.
    const q=cubic((p-.24)/.22);
    z=lerp(1,2.15,q);cx=lerp(.5,.22,q);cy=lerp(.5,.68,q);
  }else if(p<.62){
    // Continue without a cut toward the yellow "we call upon you" sign.
    const q=cubic((p-.46)/.16);
    z=lerp(2.15,4.6,q);cx=lerp(.22,.055,q);cy=lerp(.68,.065,q);
  }else{
    // V4.1.2/V4.1.3: a long, completely still final hold so the text can be read and remain present.
    z=4.6;cx=.055;cy=.065;
  }
  drawCameraContain(im,R,{zoom:z,cx,cy,filter:'brightness(.94) saturate(.82)'});
  break}

case'memorial':{drawCover(I[0],R,{a:.55,filter:'grayscale(.45)'});for(let k=1;k<4;k++){let a=stage(.14+.2*k,.44+.2*k),pad=lerp(Math.min(W,H)*.26,Math.min(W,H)*(.08+.035*k),a);drawCover(I[k],rr(R,pad),{a:.88})}break}
case'signal':{drawCover(I[0],R,{filter:'brightness(.72)'});for(let k=1;k<4;k++){let a=stage(.08+.19*k,.38+.19*k),r={x:W*(k===1?0:.18*k),y:H*(.08+.18*(k-1)),w:W*(k===1?.7:.64),h:H*.42};drawCover(I[k],r,{a,blend:k===2?'screen':'source-over'})}break}
case'event':{let rs=[{x:0,y:0,w:W*.5,h:H*.5},{x:W*.5,y:0,w:W*.5,h:H*.5},{x:0,y:H*.5,w:W*.5,h:H*.5},{x:W*.5,y:H*.5,w:W*.5,h:H*.5}];for(let k=0;k<4;k++){let a=stage(.02+.16*k,.3+.16*k),r=rs[k],dx=(k%2?1:-1)*W*.12*(1-a);drawCover(I[k],{...r,x:r.x+dx},{a})}break}
case'route':{drawCover(I[0],R,{a:.6});for(let k=1;k<4;k++){let a=stage(.1+.2*k,.42+.2*k),y=H*(.12+.24*(k-1));ctx.save();ctx.beginPath();ctx.moveTo(0,y+H*.18);ctx.lineTo(W*a,y);ctx.lineTo(W*a,y+H*.3);ctx.lineTo(0,y+H*.36);ctx.closePath();ctx.clip();drawCover(I[k],R,{a:.95});ctx.restore()}break}
case'bridge':{drawCover(I[0],R,{zoom:1.03});for(let k=1;k<4;k++){let a=stage(.12+.19*k,.44+.19*k),rad=.1+.17*k+.28*a;drawCover(I[k],R,{a,clip:circleClip(.5,.78,rad)})}break}
case'sphere_face':{
  drawCover(I[0],R,{a:.58,filter:'brightness(.72)'});
  let a=stage(.08,.26); if(a>0)drawCover(I[1],R,{a,clip:circleClip(.28,.47,.14+.18*a),zoom:1.04});
  let b=stage(.20,.42); if(b>0)drawCover(I[2],R,{a:b,clip:circleClip(.62,.48,.17+.22*b),zoom:1.04});
  let d=stage(.38,.58);
  if(d>0){ctx.fillStyle=`rgba(5,5,5,${d*.38})`;ctx.fillRect(0,0,W,H);drawContain(I[3],R,{a:d});}
  let e=stage(.60,.78);
  if(e>0){
    // V4.1.1: deliberate move to the RIGHT-HAND mirror sphere containing
    // the photographer, rather than the unrelated upper-central reflection.
    const q=cubic(e),z=lerp(1,4.2,q),cx=lerp(.5,.78,q),cy=lerp(.5,.30,q);
    drawCameraContain(I[3],R,{a:1,zoom:z,cx,cy});
  }
  if(p>=.78){
    // Hold the resolved reflection long enough to be read; no decorative motion.
    drawCameraContain(I[3],R,{a:1,zoom:4.2,cx:.78,cy:.30});
  }
  break}

case'sphere':{drawCover(I[0],R,{a:.62,filter:'brightness(.72)'});[[.28,.46,.16],[.57,.42,.19],[.72,.58,.25]].forEach((d,j)=>{let k=j+1,a=stage(.1+.2*k,.42+.2*k);drawCover(I[k],R,{a,clip:circleClip(d[0],d[1],d[2]+.12*a),zoom:1.05})});break}
case'projection':{drawCover(I[0],R,{a:.55,filter:'brightness(.65)'});for(let k=1;k<4;k++){let a=stage(.12+.2*k,.44+.2*k),l=W*(.16-.04*a),r=W*(.84+.04*a),top=H*(.14+.18*(k-1));ctx.save();ctx.beginPath();ctx.moveTo(l,top);ctx.lineTo(r,top);ctx.lineTo(W*(.72+.04*a),top+H*.28);ctx.lineTo(W*(.28-.04*a),top+H*.28);ctx.closePath();ctx.clip();drawCover(I[k],R,{a:.94,blend:k===2?'screen':'source-over'});ctx.restore()}break}
case'afterimage':{drawCover(I[0],R,{zoom:1.03});for(let k=1;k<4;k++){let a=stage(.14+.19*k,.44+.19*k);drawCover(I[k],R,{a:.72*a,dx:lerp(W*.05*(k%2?1:-1),0,a),filter:`blur(${lerp(7,0,a)}px)`,blend:k===3?'screen':'source-over'})}break}
case'fog':{drawCover(I[0],R,{filter:'brightness(.8)'});for(let k=1;k<4;k++){let a=stage(.1+.2*k,.45+.2*k);drawCover(I[k],R,{a:a*.72,filter:`blur(${lerp(12,1,a)}px) brightness(${lerp(.85,1,a)})`})}break}
case'horizon':{drawCover(I[0],R,{zoom:1.02});for(let k=1;k<4;k++){let a=stage(.12+.2*k,.44+.2*k),h=H*(.18+.09*k),y=H*(.17+.19*(k-1));ctx.save();ctx.beginPath();ctx.rect(0,y,W*a,h);ctx.clip();drawCover(I[k],R,{a:.94});ctx.restore()}break}
case'horizon_exit':{drawCover(I[0],R,{zoom:1.02});for(let k=1;k<4;k++){let a=stage(.12+.2*k,.44+.2*k),h=H*(.18+.09*k),y=H*(.17+.19*(k-1));ctx.save();ctx.beginPath();ctx.rect(0,y,W*a,h);ctx.clip();drawCover(I[k],R,{a:.94});ctx.restore()}let x=stage(.82,1);if(x>0)drawCover(I[3],R,{a:x,zoom:1.035,cx:.46});break}
case'coda':{const n=I.length,segs=Math.max(1,n-1);let s=p*segs,idx=Math.min(n-2,Math.floor(s)),lp=s-idx;drawCover(I[idx],R,{zoom:lerp(1.035,1,smooth(lp)),cx:lerp(.46,.54,smooth(lp))});let a=smooth((lp-.58)/.42);if(a>0&&idx+1<n)drawCover(I[idx+1],R,{a,zoom:lerp(1.04,1,a)});break}
default:drawCover(I[0],R)}let fin=sc.mode==='horizon_exit'?0:smooth((p-.94)/.06);if(fin>0){ctx.fillStyle=`rgba(5,5,5,${fin*.18})`;ctx.fillRect(0,0,W,H)}}
function sceneAt(time){for(let i=flat.length-1;i>=0;i--)if(time>=flat[i].start)return flat[i];return flat[0]}
function render(time){t=clamp(time,0,TOTAL);let sc=sceneAt(t),p=clamp((t-sc.start)/sc.duration);drawScene(sc,p);prog.style.width=`${100*t/TOTAL}%`;clock.textContent=`${fmt(t)} / ${fmt(TOTAL)}`;if(debug)debugEl.textContent=`${sc.index}/${flat.length} · ${sc.title} · ${sc.meaning}`}
function syncAudioTo(time){if(!heartbeat)return;const v=clamp(time,0,TOTAL);if(Math.abs((heartbeat.currentTime||0)-v)>.08){try{heartbeat.currentTime=v}catch(_){}}}
function setSound(on){soundOn=!!on;if(heartbeat)heartbeat.muted=!soundOn;if(soundBtn){soundBtn.textContent=soundOn?'Ton':'stumm';soundBtn.setAttribute('aria-label',soundOn?'Ton aus':'Ton an')}}
function frame(ts){if(!started||paused||ended)return;if(!startStamp)startStamp=ts-t*1000;let nt;if(audioStarted&&heartbeat&&!heartbeat.paused&&Number.isFinite(heartbeat.currentTime)){nt=heartbeat.currentTime}else{nt=(ts-startStamp)/1000}if(nt>=TOTAL){render(TOTAL);ended=true;if(heartbeat)heartbeat.pause();end.classList.add('show');return}render(nt);raf=requestAnimationFrame(frame)}
async function play(){if(!started||ended)return;paused=false;playBtn.textContent='Ⅱ';playBtn.setAttribute('aria-label','Pause');startStamp=performance.now()-t*1000;if(heartbeat){syncAudioTo(t);heartbeat.muted=!soundOn;try{await heartbeat.play();audioStarted=true}catch(_){audioStarted=false}}cancelAnimationFrame(raf);raf=requestAnimationFrame(frame)}
function pause(){if(!started||ended)return;paused=true;playBtn.textContent='▶';playBtn.setAttribute('aria-label','Weiter');if(heartbeat)heartbeat.pause();cancelAnimationFrame(raf)}
function seek(v){t=clamp(v,0,TOTAL);render(t);startStamp=performance.now()-t*1000;if(heartbeat)syncAudioTo(t)}
function restart(){ended=false;end.classList.remove('show');seek(0);play()}
function showUI(){if(!started)return;document.body.classList.add('ui');clearTimeout(uiTimer);uiTimer=setTimeout(()=>{if(!paused)document.body.classList.remove('ui')},1800)}
async function preload(){let n=score.source_count,done=0;imgs=Array(n);await Promise.all(Array.from({length:n},(_,i)=>new Promise(res=>{let im=new Image();im.onload=im.onerror=()=>{imgs[i]=im;done++;load.textContent=`Bilder werden vorbereitet … ${done}/${n}`;res()};im.src=`assets/${String(i+1).padStart(3,'0')}.jpg`})));load.textContent='Bereit.';enter.disabled=false}
enter.onclick=async()=>{started=true;entry.classList.add('hidden');render(0);startStamp=performance.now();setSound(true);if(heartbeat){heartbeat.currentTime=0;try{await heartbeat.play();audioStarted=true}catch(_){audioStarted=false}}raf=requestAnimationFrame(frame);showUI()};playBtn.onclick=()=>paused?play():pause();soundBtn.onclick=()=>setSound(!soundOn);replay.onclick=restart;addEventListener('pointermove',showUI,{passive:true});addEventListener('pointerdown',showUI,{passive:true});addEventListener('keydown',e=>{if(!started)return;if(e.code==='Space'){e.preventDefault();paused?play():pause()}if(e.key==='ArrowRight')seek(t+5);if(e.key==='ArrowLeft')seek(t-5);if(e.key.toLowerCase()==='m')setSound(!soundOn);if(e.key.toLowerCase()==='r')restart()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&!paused&&!ended)pause()});preload();
})();

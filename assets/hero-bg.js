/* 首屏背景：丝带般流动的粒子光带（原创，Canvas 2D）。
 * 尊重「减少动态效果」设置（只画一帧）；离开屏幕或切到后台时暂停；手机端粒子更少。 */
(function(){
const host=document.getElementById('top');if(!host)return;
const cv=document.createElement('canvas');cv.className='hero-bg';cv.setAttribute('aria-hidden','true');host.prepend(cv);
const ctx=cv.getContext('2d');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile=matchMedia('(max-width: 900px)').matches;
const DPR=Math.min(devicePixelRatio||1,mobile?1.5:1.75);
let BR=1,W=0,H=0,parts=[],stars=[],grain=null,running=false,visible=true,t0=performance.now();
// 伪随机（可复现）
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
function build(){
 W=host.clientWidth;H=host.clientHeight;cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+'px';cv.style.height=H+'px';
 seed=7;const N=Math.round((mobile?8000:20000)*Math.min(1,W*H/(1440*900)+.25));
 parts=[];for(let i=0;i<N;i++){const r=rnd();
  // 三条丝带：主带、细带、远处的薄纱
  const band=r<.62?0:r<.88?1:2;
  // v 偏向边缘，形成丝绸褶边的亮线
  let v=rnd()*2-1;v=Math.sign(v)*Math.pow(Math.abs(v),.55);
  parts.push({u:rnd(),v,band,s:.5+rnd()*1.1,a:.25+rnd()*.75,ph:rnd()*6.283,tw:.6+rnd()*1.8});}
 stars=[];const SN=mobile?90:220;for(let i=0;i<SN;i++)stars.push({x:rnd()*W,y:rnd()*H,s:rnd()*1.1+.2,a:rnd()*.5+.08,ph:rnd()*6.283});
 // 颗粒噪点贴图
 grain=document.createElement('canvas');grain.width=grain.height=160;const g=grain.getContext('2d'),id=g.createImageData(160,160);
 for(let i=0;i<id.data.length;i+=4){const v=rnd()*255;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=rnd()<.5?14:0;}g.putImageData(id,0,0);
}
const B=[ // 每条丝带：中心线振幅、频率、速度、宽度、竖直位置、亮度
 {amp:.34,f:1.0,sp:.05,w:.30,y:.40,k:1.25},
 {amp:.20,f:1.55,sp:-.04,w:.09,y:.50,k:.75},
 {amp:.30,f:.75,sp:.03,w:.42,y:.32,k:.30}];
function ctr(b,bi,u,t,sc){const xn=u*Math.PI*2,d=b.sp<0?-1:1;
 // 行波：波峰沿丝带方向持续流动；外加缓慢的整体起伏
 const T=4.2+Math.sin(t*.12+bi)*.35+t*.04; // 形状基本固定，只做小幅、缓慢的起伏
 const c=H*b.y+Math.sin(xn*b.f-T*.42*d)*sc*b.amp*.55+Math.sin(xn*b.f*2.1-T*.75*d+bi)*sc*b.amp*.16+Math.sin(t*.1+bi*1.7)*sc*.008;
 const tw=Math.cos(xn*b.f*.9-(4.2+Math.sin(t*.09+bi)*.18)*.5*d+bi);return [c,sc*b.w*(.22+.78*Math.abs(tw)),tw];}
const bk=Array.from({length:28},()=>[]);
const gc=document.createElement('canvas'),gx=gc.getContext('2d');
function glowLayer(t,sc){const k=mobile?.12:.16;gc.width=Math.max(2,W*k|0);gc.height=Math.max(2,H*k|0);gx.setTransform(k,0,0,k,0,0);gx.clearRect(0,0,W,H);gx.globalCompositeOperation='lighter';
 B.forEach((b,bi)=>{for(const [f,a] of [[.9,.028],[.55,.05],[.25,.08]]){gx.beginPath();const top=[],bot=[];
  for(let i=0;i<=60;i++){const u=i/60,x=-.1*W+u*W*1.2,[c,w,tw]=ctr(b,bi,u,t,sc);top.push([x,c-w*f]);bot.push([x,c+w*f*(.4+.6*Math.abs(tw))]);}
  gx.moveTo(...top[0]);top.forEach(p=>gx.lineTo(...p));bot.reverse().forEach(p=>gx.lineTo(...p));gx.closePath();gx.fillStyle=`rgba(255,236,234,${a*b.k*BR})`;gx.fill();}});
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.imageSmoothingQuality='high';ctx.filter='none';ctx.drawImage(gc,0,0,W,H);ctx.restore();}

function draw(now){
 const t=(now-t0)/1000;BR=.95+.05*Math.sin(t*.4);ctx.setTransform(DPR,0,0,DPR,0,0);ctx.globalCompositeOperation='source-over';
 ctx.fillStyle='#0a0a0a';ctx.fillRect(0,0,W,H);
 // 柔和的珍珠色辉光
 const glow=ctx.createRadialGradient(W*.62,H*.36,0,W*.62,H*.36,Math.max(W,H)*.6);
 glow.addColorStop(0,'rgba(232,214,214,.10)');glow.addColorStop(.5,'rgba(200,190,200,.035)');glow.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
 ctx.globalCompositeOperation='lighter';
 for(const s of stars){ctx.fillStyle=`rgba(240,236,236,${s.a*(.6+.4*Math.sin(t*.8+s.ph))})`;ctx.fillRect(s.x,s.y,s.s,s.s);}
 const sc=Math.min(W,H*1.6);
 glowLayer(t,sc);
 sheen(t,sc);
 const NB=14;for(let i=0;i<NB*2;i++)bk[i].length=0;
 for(const p of parts){const b=B[p.band];const u=(p.u+t*(.005+.003*p.band)*(b.sp<0?-1:1)%1+1)%1;const [c,w,tw]=ctr(b,p.band,u,t,sc);const x=-.1*W+u*W*1.2;
  const y=c+p.v*w+Math.sin(t*.6+p.ph)*1.5;const edge=Math.pow(Math.abs(p.v),3);const sh=.55+.45*Math.sin(t*p.tw+p.ph);
  const al=Math.min(1,BR*b.k*p.a*(.5+1.1*edge)*(.55+.45*sh)*(.5+.5*Math.abs(tw)));if(al<.04)continue;
  bk[(p.v>0?NB:0)+Math.min(NB-1,al*NB|0)].push(x,y,p.s);}
 for(let i=0;i<NB*2;i++){const L=bk[i];if(!L.length)continue;ctx.beginPath();for(let j=0;j<L.length;j+=3)ctx.rect(L[j],L[j+1],L[j+2],L[j+2]);
  ctx.fillStyle=(i>=NB?'rgba(255,244,242,':'rgba(242,240,248,')+(((i%NB)+.5)/NB).toFixed(3)+')';ctx.fill();}
 ctx.globalCompositeOperation='source-over';
 ctx.fillStyle=ctx.createPattern(grain,'repeat');ctx.fillRect(0,0,W,H);
 // 底部渐隐到黑色
 const fade=ctx.createLinearGradient(0,H*.62,0,H);fade.addColorStop(0,'rgba(10,10,10,0)');fade.addColorStop(1,'#0a0a0a');ctx.fillStyle=fade;ctx.fillRect(0,H*.62,W,H*.38);
 // 左下文字区压暗，保证标题可读
 const rd=ctx.createRadialGradient(W*.22,H*.55,0,W*.22,H*.55,W*.5);rd.addColorStop(0,'rgba(10,10,10,.62)');rd.addColorStop(.6,'rgba(10,10,10,.3)');rd.addColorStop(1,'rgba(10,10,10,0)');ctx.fillStyle=rd;ctx.fillRect(0,0,W,H);
}
function sheen(t,sc){const NL=mobile?34:64;B.forEach((b,bi)=>{const lines=bi===0?NL:bi===1?Math.round(NL*.4):Math.round(NL*.5);
 for(let l=0;l<lines;l++){const v0=l/(lines-1)*2-1;const edge=Math.pow(Math.abs(v0),4);ctx.beginPath();
  for(let k=0;k<=90;k++){const u=k/90,x=-.1*W+u*W*1.2;const [c,w]=ctr(b,bi,u,t,sc);
   // 丝线在带内缓慢滑动、交错
   const v=v0+Math.sin(u*9+l*.7-t*.25)*.02*(1-Math.abs(v0));const y=c+v*w;k?ctx.lineTo(x,y):ctx.moveTo(x,y);}
  ctx.lineWidth=1;ctx.strokeStyle=`rgba(255,242,240,${Math.min(.5,BR*b.k*(.05+.22*edge))})`;ctx.stroke();}
 });}
let last=0;function loop(now){if(!running)return;if(!document.body.classList.contains('noscroll')&&(!mobile||now-last>32)){draw(now);last=now;}requestAnimationFrame(loop);}
function start(){if(reduce||running||!visible||document.hidden)return;running=true;requestAnimationFrame(loop);}
function stop(){running=false;}
build();draw(performance.now()+8000);
new IntersectionObserver(e=>{visible=e[0].isIntersecting;visible?start():stop();}).observe(host);
document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
let rz;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{build();draw(performance.now());},200);});
window.__heroBg={draw:()=>draw(performance.now()),at:sec=>{stop();draw(t0+sec*1000);},stop:()=>{stop();}};
start();
})();

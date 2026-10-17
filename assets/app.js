/* 页面渲染 + 阅读器 + 隐藏编辑模式。一般不需要修改此文件。 */
(function(){
const LS='zouyue-site-content-v2', LSA='zouyue-site-articles-v1';
const EDIT=/[?&]edit=1/.test(location.search);var RAW0=null;
const ORIG=JSON.parse(JSON.stringify(window.SITE));
let S=window.SITE, editing=EDIT;
if(EDIT){try{const x=localStorage.getItem(LS);if(x){S=JSON.parse(x);RAW0=JSON.parse(x);for(const k in ORIG)if(!(k in S))S[k]=ORIG[k];/* 已删除的板块和实验：旧草稿里也去掉 */const GONE=['小汤 · 猫咪语音伙伴','戳泡泡 · 点一下','手机桌宠'];delete S.workflow;if(Array.isArray(S.sections))S.sections=S.sections.filter(s=>s&&s.type!=='workflow');if(Array.isArray(S.experiments))S.experiments=S.experiments.filter(e=>!(e&&!e.link&&GONE.includes(e.title)));if(JSON.stringify(S)!==x)try{localStorage.setItem(LS,JSON.stringify(S));}catch(e){}if(Array.isArray(S.experiments)){const have=new Set(S.experiments.map(e=>e.link||e.title));(ORIG.experiments||[]).forEach(e=>{if(e.link&&!have.has(e.link)&&!S.experiments.some(x=>x.title===e.title))S.experiments.push(JSON.parse(JSON.stringify(e)));});}if(Array.isArray(S.articles)){/* content.js 里新加的文章自动补进旧草稿；草稿里删掉过的不再加回 */let seen=null;try{seen=JSON.parse(localStorage.getItem(LS+':seenArt')||'null');}catch(e){}const have=new Set(S.articles.map(x=>x.id));(ORIG.articles||[]).forEach(e=>{if(!have.has(e.id)&&!(seen&&seen.includes(e.id)))S.articles.push(JSON.parse(JSON.stringify(e)));});}}}catch(e){}try{localStorage.setItem(LS+':seenArt',JSON.stringify((ORIG.articles||[]).map(x=>x.id)));}catch(e){}}
/* content.js 更新后与浏览器草稿对齐（首屏一句话、关于我、产品笔记、成长记录、结束语）：
 * 草稿里这几项没动过 → 自动换成 content.js 的新内容；草稿里改过、content.js 也变了 → 底部提示，让你选。 */
const LSB=LS+':base',SYNC={'hero.lead':'首屏一句话',about:'关于我',notes:'产品笔记',timeline:'成长记录',experiments:'小实验','contact.headline':'结束语'};
const LEGACY={'hero.lead':['j96l36'],about:['u8b8v0'],notes:['rq424u'],timeline:['g3djw9'],experiments:['c0c1z6','v5mhgc'],'contact.headline':['lgjt25']};/* 2026.10.17 之前 content.js 的版本指纹 */
const hsh=t=>{let x=5381;for(let i=0;i<t.length;i++)x=((x<<5)+x+t.charCodeAt(i))|0;return (x>>>0).toString(36)};
const gp=(o,p)=>p.split('.').reduce((o,k)=>o==null?o:o[k],o);
const sp=(o,p,v)=>{const ks=p.split('.'),l=ks.pop();ks.reduce((o,k)=>o[k]=o[k]||{},o)[l]=JSON.parse(JSON.stringify(v));};
const origH=k=>hsh(JSON.stringify(gp(ORIG,k)));
let syncConflicts=[];
if(EDIT){let base={};try{base=JSON.parse(localStorage.getItem(LSB)||'{}')||{};}catch(e){}
 const had=!!localStorage.getItem(LS);let changed=false;
 for(const k in SYNC){const o=JSON.stringify(gp(ORIG,k)),d=JSON.stringify(gp(S,k));
  if(!had||o===d||base[k]===hsh(o)){base[k]=hsh(o);continue;}
  const tst=v=>base[k]?hsh(String(v))===base[k]:(LEGACY[k]||[]).includes(hsh(String(v)));const untouched=tst(d)||(RAW0&&tst(JSON.stringify(gp(RAW0,k))));
  if(untouched||d===undefined){sp(S,k,gp(ORIG,k));base[k]=hsh(o);changed=true;}else syncConflicts.push(k);}
 /* 已下线的小实验（链接已失效）：草稿里也去掉 */if(Array.isArray(S.experiments)){const n=S.experiments.length;S.experiments=S.experiments.filter(e=>!(e&&/demos\/(paste-desk|file-drop)\//.test(e.link||'')));if(n!==S.experiments.length)changed=true;}
 try{if(changed)localStorage.setItem(LS,JSON.stringify(S));localStorage.setItem(LSB,JSON.stringify(base));}catch(e){}}
function syncBanner(){if(!syncConflicts.length)return;const b=document.createElement('div');b.id='esync';
 b.innerHTML=`<span>content.js 里的「${syncConflicts.map(k=>SYNC[k]).join('」「')}」更新了，但你在这个浏览器里也改过。</span><button data-s="new">用最新内容</button><button data-s="keep">保留我的修改</button>`;
 document.body.appendChild(b);
 b.addEventListener('click',e=>{const a=e.target.dataset.s;if(!a)return;
  if(a==='new'&&!confirm('用 content.js 的最新内容替换浏览器里的「'+syncConflicts.map(k=>SYNC[k]).join('」「')+'」？你在这几项里的修改会丢失（其他内容不受影响）。'))return;
  let base={};try{base=JSON.parse(localStorage.getItem(LSB)||'{}')||{};}catch(e){}
  syncConflicts.forEach(k=>{if(a==='new')sp(S,k,gp(ORIG,k));base[k]=origH(k);});
  localStorage.setItem(LSB,JSON.stringify(base));syncConflicts=[];b.remove();if(a==='new'){save();render();}});}
const artOverrides=EDIT?JSON.parse(localStorage.getItem(LSA)||'{}'):{};
/* 上传文章的正文存在浏览器 IndexedDB（容量大，能放图片）；不支持时退回 localStorage */
const UP={},LSU='zouyue-site-upbodies-v1';let idb=null;
const idbReq=(mode,fn)=>new Promise((ok,no)=>{const t=idb.transaction('bodies',mode),r=fn(t.objectStore('bodies'));t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>no(t.error);});
const upReady=!EDIT?Promise.resolve():new Promise(res=>{const fb=()=>{idb=null;try{Object.assign(UP,JSON.parse(localStorage.getItem(LSU)||'{}'));}catch(e){}res();};
 try{const o=indexedDB.open('zouyue-site',1);o.onupgradeneeded=()=>o.result.createObjectStore('bodies');o.onerror=fb;
  o.onsuccess=()=>{idb=o.result;const t=idb.transaction('bodies'),st=t.objectStore('bodies'),c=st.openCursor();c.onsuccess=()=>{const k=c.result;if(k){UP[k.key]=k.value;k.continue();}else res();};c.onerror=fb;};}catch(e){fb();}});
async function putBody(id,html){UP[id]=html;if(idb)return idbReq('readwrite',st=>st.put(html,id));localStorage.setItem(LSU,JSON.stringify(UP));}
async function delBody(id){delete UP[id];if(artOverrides[id]!=null){delete artOverrides[id];localStorage.setItem(LSA,JSON.stringify(artOverrides));}if(idb)return idbReq('readwrite',st=>st.delete(id));localStorage.setItem(LSU,JSON.stringify(UP));}
async function clearBodies(){for(const k in UP)delete UP[k];localStorage.removeItem(LSU);if(idb)return idbReq('readwrite',st=>st.clear());}
const $=(s,r=document)=>r.querySelector(s);
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pad=n=>String(n).padStart(2,'0');
// 可编辑文本：data-p 为数据路径
const T=(tag,path,cls='',extra='')=>`<${tag} class="${cls}" data-p="${path}" ${extra}>${esc(get(path)).replace(/\n/g,'<br>')}</${tag}>`;
function get(p){return p.split('.').reduce((o,k)=>o==null?o:o[k],S);}
function set(p,v){const ks=p.split('.');const last=ks.pop();const o=ks.reduce((o,k)=>o[k],S);o[last]=v;}
const ctl=(list,i)=>`<span class="ectl" data-list="${list}" data-i="${i}"><button data-act="up" title="上移">↑</button><button data-act="down" title="下移">↓</button><button data-act="del" title="删除">✕</button></span>`;
const add=(list)=>`<button class="eadd" data-list="${list}">＋ 添加一项</button>`;


/* 文章列表：按日期自动排序（新→旧），分页 */
const PER=5;let artPage=1;
const NPER=6;let notePage=1;/* 产品笔记每页 6 张（桌面 3 列 × 2 行） */
const dkey=d=>{const m=String(d||'').match(/(\d{4})\D+(\d{1,2})(?:\D+(\d{1,2}))?/);return m?+(m[1]+pad(m[2])+pad(m[3]||1)):99999999;};
const nkey=n=>{const v=String(n.period||'').trim();return !v||/^(待写|待填写)/.test(v)?-1:dkey(v);};/* 按使用时间新→旧，没写时间的排最后 */
function artList(){
 const rows=S.articles.map((a,i)=>({a,i})).sort((x,y)=>dkey(y.a.date)-dkey(x.a.date));
 const n=Math.max(1,Math.ceil(rows.length/PER));if(artPage>n)artPage=n;
 const cur=rows.slice((artPage-1)*PER,artPage*PER);
 const items=cur.map(({a,i})=>`<div class="arow eitem" data-open="${esc(a.id)}" tabindex="0" role="button">${T('time','articles.'+i+'.date')}<div class="atx">${T('h3','articles.'+i+'.title')}${T('p','articles.'+i+'.summary')}</div><div class="cv">${a.cover||EDIT?`<img data-img="articles.${i}.cover" src="${esc(a.cover)}" alt=""${a.cover?'':' class="noimg"'}>`:''}${a.cover?'':`<span class="cvph" aria-hidden="true">${esc(a.coverText||String(a.title||'').replace(/^待填写：/,'').slice(0,6))}</span>`}</div><span class="readmore">阅读 →</span>${EDIT?`${a.uploaded?'<span class="anew">新上传</span>':''}<span class="ectl" data-list="articles" data-i="${i}"><button data-act="edit" title="修改标题、日期、封面和正文">编辑</button><button data-act="del" title="删除">✕</button></span>`:''}</div>`).join('');
 let pg='';if(n>1){const b=(p,l,dis,on)=>`<button data-pg="${p}" ${dis?'disabled':''} class="${on?'on':''}" ${on?'aria-current="page"':''}>${l}</button>`;
  pg=`<div class="pager" role="navigation" aria-label="文章分页">${b(artPage-1,'← 上一页',artPage===1)}<span class="pnums">${Array.from({length:n},(_,k)=>b(k+1,pad(k+1),false,k+1===artPage)).join('')}</span>${b(artPage+1,'下一页 →',artPage===n)}<span class="pinfo">共 ${rows.length} 篇</span></div>`;}
 return `<div class="arows">${items}</div>${pg}`;}
document.addEventListener('click',e=>{const b=e.target.closest('[data-pg]');if(!b||b.disabled)return;e.preventDefault();artPage=+b.dataset.pg;render();const w=$('#alist');w&&scrollTo({top:w.getBoundingClientRect().top+scrollY-110});});
const R={
about(){return `<div class="about rv"><span></span><div><div class="txt">${S.about.paragraphs.map((_,i)=>`<div class="eitem">${T('p','about.paragraphs.'+i)}${ctl('about.paragraphs',i)}</div>`).join('')}${add('about.paragraphs')}</div>
<div class="tags">${S.about.tags.map((_,i)=>`<span class="eitem">${T('em','about.tags.'+i)}${ctl('about.tags',i)}</span>`).join('')}${add('about.tags')}</div></div></div>`},
writing(){return `<div class="thinking rv">${S.thinking.map((_,i)=>`<div class="eitem"><small>正在思考 · ${pad(i+1)}</small>${T('p','thinking.'+i)}${ctl('thinking',i)}</div>`).join('')}</div>${add('thinking')}
<div class="alist" id="alist">${artList()}</div>${EDIT?'<button class="eadd eup" data-up="1">⬆ 上传文章</button> ':''}${add('articles')}`},
notes(){const f=window.__nf||'全部';
 const PD=v=>v==null||String(v).trim()===''||/^(待写|待填写)/.test(String(v).trim());
 /* 卡片只放短信息（类型、名称、定位、使用时间、我想回答），长内容点开后在阅读页里看；编辑模式下点「编辑详情」改全部字段 */
 const rows=S.notes.map((n,i)=>({n,i})).filter(({n})=>f==='全部'||n.type===f).sort((x,y)=>nkey(y.n)-nkey(x.n));
 const pages=Math.max(1,Math.ceil(rows.length/NPER));if(notePage>pages)notePage=pages;if(notePage<1)notePage=1;
 const cur=rows.slice((notePage-1)*NPER,notePage*NPER);
 const cards=cur.map(({n,i})=>{const P='notes.'+i,rev=n.type==='测评';
  const parts=rev?['verdict','feeling']:['problem','highlight','improve'];
  const draft=!n.body&&parts.every(k=>PD(n[k]));
  const per=EDIT?T('span',P+'.period','nper'+(PD(n.period)?' pend':'')):(!PD(n.period)?`<span class="nper">${esc(n.period)}</span>`:'');
  const tag=EDIT||!PD(n.tag)?T('p',P+'.tag','ntl'+(PD(n.tag)?' pend':'')):'';
  const q=EDIT||!PD(n.question)?`<div class="nq"><small>我想回答</small>${T('p',P+'.question',PD(n.question)?'pend':'')}</div>`:'';
  const link=EDIT?`<div class="nlink-e">官网：${T('span',P+'.link')}</div>`:(n.link?`<a class="nlink" href="${esc(n.link)}" target="_blank" rel="noopener">官网 ↗</a>`:'');
  const go=EDIT?`<button class="nmore" data-note="${i}">编辑详情 →</button>`:(draft?'<span class="nwip"><i></i>撰写中</span>':'<span class="nmore">查看笔记 →</span>');
  const del=EDIT?`<span class="ectl" data-list="notes" data-i="${i}"><button data-act="del" title="删除">✕</button></span>`:'';
  return `<article class="note tile ${rev?'rev':'td'} rv eitem${draft?' ndraft':''}"${EDIT?'':` data-note="${i}" tabindex="0" role="button" aria-label="${esc(n.name)}"`}><div class="nh"><span class="ntype">${rev?'测评':'拆解'}</span>${per}</div>${T('h3',P+'.name')}${tag}${q}<div class="nbot">${go}${link}</div>${del}</article>`;}).join('');
 let pg='';if(pages>1){const b=(p,l,dis,on)=>`<button data-npg="${p}" ${dis?'disabled':''} class="${on?'on':''}" ${on?'aria-current="page"':''}>${l}</button>`;
  pg=`<div class="pager" role="navigation" aria-label="产品笔记分页">${b(notePage-1,'← 上一页',notePage===1)}<span class="pnums">${Array.from({length:pages},(_,k)=>b(k+1,pad(k+1),false,k+1===notePage)).join('')}</span>${b(notePage+1,'下一页 →',notePage===pages)}<span class="pinfo">共 ${rows.length} 款</span></div>`;}
 return `<div class="ntabs rv">${['全部','拆解','测评'].map(k=>`<button class="ntab ${k===f?'on':''}" data-nf="${k}">${k}<sup>${k==='全部'?S.notes.length:S.notes.filter(n=>n.type===k).length}</sup></button>`).join('')}</div>
<div class="notes" id="nlist">${cards||'<p class="nempty">这一类还没有笔记。</p>'}</div>${pg}${EDIT?`<div class="nadd"><button class="eadd" data-list="notes" data-type="拆解">＋ 添加拆解</button> <button class="eadd" data-list="notes" data-type="测评">＋ 添加测评</button></div>`:''}`},
lab(){return `<div class="exps">${S.experiments.map((x,i)=>{const P='experiments.'+i;
 const shot=x.image?`<img data-img="${P}.image" src="${esc(x.image)}" alt="">`:x.art==='film'?`<div class="film" data-img="${P}.image"><div class="m">${[[22,28],[58,22],[40,52],[66,60],[24,66]].map((q,j)=>`<span class="h" style="left:${q[0]}%;top:${q[1]}%;animation-delay:${j*.25}s"></span>`).join('')}</div></div>`:`<div class="film" data-img="${P}.image"><span class="dots">· · ·</span></div>`;
 const shotH=x.link&&!EDIT?`<a class="shot" href="${esc(x.link)}" data-x="${i}" aria-label="${esc(x.title)}"><span class="xzoom">点开试玩 ⤢</span>${shot}</a>`:`<div class="shot">${shot}</div>`;
 const tag=x.tag||EDIT?T('span',P+'.tag','xtag'):'';
 const go=x.link&&!EDIT?`<a class="xgo" href="${esc(x.link)}" data-x="${i}">立即体验 →</a>`:EDIT?`<div class="xlink">链接：${T('span',P+'.link')}</div>`:'';
 return `<article class="exp rv eitem">${shotH}<div class="body"><span class="status ${x.wip?'wip':''}"><i></i>${T('span',P+'.status')}</span>${tag}${T('h3',P+'.title')}${T('p',P+'.desc')}<dl>${x.points.map((_,j)=>`<div class="eitem dl">${T('dt',P+'.points.'+j+'.k')}${T('dd',P+'.points.'+j+'.v')}${ctl(P+'.points',j)}</div>`).join('')}</dl>${add(P+'.points')}${go}${EDIT?`<label class="etog"><input type="checkbox" data-bool="${P}.wip" ${x.wip?'checked':''}> 进行中（空心圆点）</label>`:''}</div>${ctl('experiments',i)}</article>`}).join('')}</div>${add('experiments')}`},
growth(){return `<div class="tl">${S.timeline.map((t,i)=>`<div class="ti rv eitem ${t.placeholder?'ph':''}">${T('time','timeline.'+i+'.date')}${T('h3','timeline.'+i+'.title')}${T('p','timeline.'+i+'.desc')}${EDIT?`<label class="etog"><input type="checkbox" data-bool="timeline.${i}.placeholder" ${t.placeholder?'checked':''}> 占位</label>`:''}${ctl('timeline',i)}</div>`).join('')}</div>${add('timeline')}`}
};
const TPL={'about.paragraphs':'新的一段','about.tags':'新标签',thinking:'新的观点',
 articles:()=>{artPage=1;const d=new Date();return {id:'new'+Date.now().toString(36),date:d.getFullYear()+'.'+pad(d.getMonth()+1)+'.'+pad(d.getDate()),cover:'',title:'待填写：文章标题',summary:'待填写：摘要'}},
 notes:(ty)=>ty==='测评'?{type:'测评',name:'待填写：产品名',link:'',tag:'待写：一句话定位',question:'待写：我想回答的问题',period:'待写：使用时间',verdict:'待写：一句话评价',feeling:'待写：使用感受',rating:'',tags:[],image:'',body:''}:{type:'拆解',name:'待填写：产品名',link:'',tag:'待写：一句话定位',question:'待写：我想回答的问题',period:'待写：使用时间',problem:'待写：它解决什么问题',highlight:'待写：体验亮点',improve:'待写：我会怎么改',body:''},
 experiments:()=>({title:'待填写：实验名',status:'进行中',wip:true,tag:'',link:'',image:'',art:'dots',desc:'待填写',points:[]}),
 timeline:()=>({date:'待填写',title:'待填写',desc:'一句话描述。',placeholder:true})};
function tplFor(list,ty){if(/^notes\.\d+\.tags$/.test(list))return'标签';if(/^experiments\.\d+\.points$/.test(list))return{k:'要点',v:'待填写'};const t=TPL[list];return typeof t==='function'?t(ty):t;}

function render(){
 document.title=S.meta.title;
 const vis=S.sections.filter(s=>s.visible&&R[s.type]);
 $('#nav').innerHTML=`<div class="wrap"><a class="logo" href="#top" aria-label="${esc(S.brand.alt)}"><img class="lg-d" data-img="brand.logoOnDark" src="${esc(S.brand.logoOnDark)}" alt="${esc(S.brand.alt)}"><img class="lg-l" data-img="brand.logoOnLight" src="${esc(S.brand.logoOnLight)}" alt=""></a><ul>${vis.map(s=>`<li><a href="#${s.type}">${esc(s.nav)}</a></li>`).join('')}</ul></div>`;
 if(S.hero){['wordmark','image'].forEach(k=>{if(S.hero[k]==null&&ORIG.hero[k]!=null)S.hero[k]=ORIG.hero[k];});if(S.hero.image==='assets/hero-girl.svg')S.hero.image=ORIG.hero.image;}
 const H=S.hero,em=esc(S.contact.email),wm=H.wordmark||ORIG.hero.wordmark||'melodyz',girl=H.image||ORIG.hero.image||'assets/hero-girl.webp';
 const ld=String(H.lead||''),cut=ld.search(/[，,]/);
 const lead=EDIT?T('h1','hero.lead','hhead'):`<h1 class="hhead">${cut>0?`<span>${esc(ld.slice(0,cut+1))}</span><span class="olive">${esc(ld.slice(cut+1))}</span>`:`<span>${esc(ld)}</span>`}</h1>`;
 $('#heroInner').innerHTML=`<div class="hcard"><div class="hedge hl"><a href="mailto:${em}">联系我</a></div><div class="hedge hr" aria-hidden="true"><span class="plus">+</span><span>melodyzpm.com</span></div>
<div class="htop">${T('b','hero.name')}<i></i>${T('span','hero.eyebrow')}</div>${lead}
<div class="hword" aria-hidden="true">${EDIT?T('span','hero.wordmark'):esc(wm)}</div>
<img class="hgirl"${EDIT?' data-img="hero.image"':''} src="${esc(girl)}" alt="戴眼镜的女生坐在白色方块上用笔记本电脑写东西的插画">
<div class="hbot"><div class="meta">${H.meta.map((_,i)=>`<div class="eitem">${T('span','hero.meta.'+i+'.label')}${T('b','hero.meta.'+i+'.value')}${ctl('hero.meta',i)}</div>`).join('')}</div><a class="hgo" href="#writing">看看我在写什么 <span>→</span></a></div></div>`;
 $('#main').innerHTML=vis.map((s,k)=>{const i=S.sections.indexOf(s);return `<section class="blk ${s.dark?'dk':''}" id="${s.type}"><div class="wrap"><div class="head rv"><span class="num">${pad(k+1)} / ${T('span','sections.'+i+'.num')}</span><div>${T('h2','sections.'+i+'.title')}${s.subtitle||EDIT?T('p','sections.'+i+'.subtitle'):''}</div></div>${R[s.type]()}</div></section>`}).join('');
 const c=S.contact;
 $('#foot').innerHTML=`<div class="wrap">${T('p','contact.headline','big rv')}<a class="mail" href="mailto:${esc(c.email)}" data-p="contact.email">${esc(c.email)}</a>${(EDIT||c.copyright||c.credit)?`<div class="bt">${T('span','contact.copyright')}${T('span','contact.credit')}</div>`:''}</div>`;
 reveal(); if(EDIT) armEdit(); navState();
}
let io;function reveal(){io&&io.disconnect();io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.08});document.querySelectorAll('.rv').forEach(el=>io.observe(el));}
function navState(){const n=$('#nav');if(!n)return;n.classList.toggle('s',scrollY>40);
 n.classList.add('showlogo');
 n.classList.add('light');}
addEventListener('scroll',navState,{passive:true});addEventListener('resize',navState);

/* ---------- 阅读器 ---------- */
const loaded={};
async function loadArticle(id){await upReady;if(UP[id]!=null)return UP[id];return new Promise(res=>{if(artOverrides[id]!=null)return res(artOverrides[id]);if(window.ARTICLES&&window.ARTICLES[id]!=null)return res(window.ARTICLES[id]);
 const s=document.createElement('script');s.src='assets/articles/'+id+'.js';s.onload=()=>res((window.ARTICLES||{})[id]||'<p>（正文为空）</p>');s.onerror=()=>res('<p>还没有正文。请新建 assets/articles/'+esc(id)+'.js</p>');document.head.appendChild(s);});}
let lastScroll=0;
async function openReader(id){const a=S.articles.find(x=>x.id===id);if(!a)return;
 const r=$('#reader');lastScroll=scrollY;
 r.innerHTML=`<div class="rbar"><img class="rlogo" src="${esc(S.brand.logoOnLight)}" alt="${esc(S.brand.alt)}"><span class="ract">${EDIT?'<button class="rexp">导出本文 .js</button>':''}<button class="rclose" aria-label="关闭">返回 ✕</button></span></div><article class="rbody"><time>${esc(a.date)}</time><h1>${esc(a.title)}</h1>${a.cover?`<img class="rcover" src="${esc(a.cover)}" alt="">`:''}<div class="rtext">加载中…</div><p class="rend">— 完 —</p></article>`;
 r.classList.add('open');document.body.classList.add('noscroll');r.scrollTop=0;
 const html=await loadArticle(id);const t=$('.rtext',r);t.innerHTML=html;
 if(EDIT){t.contentEditable=true;t.addEventListener('input',()=>{if(UP[id]!=null)putBody(id,t.innerHTML);else{artOverrides[id]=t.innerHTML;localStorage.setItem(LSA,JSON.stringify(artOverrides));}flash();});
  $('.rexp',r).onclick=()=>download(id+'.js',articleJS(id,t.innerHTML));}
 $('.rclose',r).onclick=()=>{history.pushState('',document.title,location.pathname+location.search);closeReader();};
 const h='#article/'+id;if(location.hash!==h)history.pushState(null,'',h);}
function closeReader(){const r=$('#reader');r.classList.remove('open');document.body.classList.remove('noscroll');scrollTo(0,lastScroll);}
function route(){const m=location.hash.match(/^#article\/(.+)$/),q=location.hash.match(/^#note\/(\d+)$/);if(m)openReader(decodeURIComponent(m[1]));else if(q)openNote(+q[1]);else if($('#reader').classList.contains('open'))closeReader();}
addEventListener('popstate',route);addEventListener('hashchange',route);
addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#reader').classList.contains('open')){history.pushState('',document.title,location.pathname+location.search);closeReader();}});
document.addEventListener('click',e=>{const c=e.target.closest('[data-open]');if(!c||(editing&&!e.target.closest('.readmore')))return;e.preventDefault();openReader(c.dataset.open);});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches&&e.target.matches('[data-open]'))openReader(e.target.dataset.open);});

document.addEventListener('click',e=>{const t=e.target.closest('[data-nf]');if(t){window.__nf=t.dataset.nf;notePage=1;const y=scrollY;render();scrollTo(0,y);document.querySelectorAll('#notes .rv').forEach(x=>x.classList.add('in'));return;}
 const pb=e.target.closest('[data-npg]');if(pb){e.preventDefault();if(pb.disabled)return;notePage=+pb.dataset.npg;render();document.querySelectorAll('#notes .rv').forEach(x=>x.classList.add('in'));const w=$('#notes');w&&scrollTo({top:w.getBoundingClientRect().top+scrollY-40});return;}
 if(e.target.closest('a.nlink'))return;
 const m=e.target.closest('[data-note]');if(m){e.preventDefault();openNote(+m.dataset.note);}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches&&e.target.matches('.note[data-note]'))openNote(+e.target.dataset.note);});
function openNote(i){const n=S.notes[i];if(!n)return;const r=$('#reader');if(!r.classList.contains('open'))lastScroll=scrollY;
 const P='notes.'+i,rev=n.type==='测评',PD=v=>v==null||String(v).trim()===''||/^(待写|待填写)/.test(String(v).trim());
 const fld=(label,k,cls='')=>EDIT||!PD(n[k])?`<div class="nf ${cls}"><dt>${label}</dt>${T('dd',P+'.'+k,PD(n[k])?'pend':'')}</div>`:'';
 const fields=(rev?[['一句话评价','verdict','big'],['使用感受','feeling']]:[['解决什么问题','problem'],['体验亮点','highlight'],['我会怎么改','improve']]).map(a=>fld(...a)).join('');
 const rating=rev&&(EDIT||n.rating)?`<div class="nf"><dt>评分</dt>${T('dd',P+'.rating',n.rating?'':'pend')}</div>`:'';
 const tags=rev&&(EDIT||(n.tags||[]).length)?`<div class="nf"><dt>标签</dt><dd class="rtags"${EDIT?` data-tags="${P}.tags" contenteditable="true" title="用逗号分隔"`:''}>${EDIT?esc((n.tags||[]).join('，')):(n.tags||[]).map(t=>`<em>${esc(t)}</em>`).join('')}</dd></div>`:'';
 const meta=EDIT?`<div class="rmeta-e"><span>类型：${esc(n.type)}</span><span>使用时间：${T('span',P+'.period')}</span><span>官网：${T('span',P+'.link')}</span></div>`:'';
 const paras=String(n.body||'').split(/\n\s*\n/).filter(x=>x.trim()).map(x=>`<p>${esc(x).replace(/\n/g,'<br>')}</p>`).join('');
 const img=n.image?`<img class="rcover"${EDIT?` data-img="${P}.image"`:''} src="${esc(n.image)}" alt="">`:(EDIT&&rev?`<div class="rimg-e" data-img="${P}.image">＋ 配图（可选）</div>`:'');
 const tm=`${esc(n.type)}${!PD(n.period)?' · '+esc(n.period):''}`;
 r.innerHTML=`<div class="rbar"><img class="rlogo" src="${esc(S.brand.logoOnLight)}" alt="${esc(S.brand.alt)}"><span class="ract"><button class="rclose">返回 ✕</button></span></div><article class="rbody rnote"><time>${tm}</time>${T('h1',P+'.name')}${EDIT||!PD(n.tag)?T('p',P+'.tag','rsub'+(PD(n.tag)?' pend':'')):''}${meta}${EDIT||!PD(n.question)?`<div class="rq"><small>我想回答</small>${T('p',P+'.question',PD(n.question)?'pend':'')}</div>`:''}<dl class="nfields">${fields}${rating}${tags}</dl>${img}${paras||EDIT?`<div class="rdiv"><span>全文</span></div><div class="rtext">${paras||(EDIT?'<p>（在这里写全文，空一行分段）</p>':'')}</div>`:''}${n.link&&!EDIT?`<p class="rlink"><a href="${esc(n.link)}" target="_blank" rel="noopener">官网 ↗</a></p>`:''}<p class="rend">— 完 —</p></article>`;
 r.classList.add('open');document.body.classList.add('noscroll');r.scrollTop=0;
 if(EDIT){bindEdit(r);const t=$('.rtext',r);t.contentEditable=true;t.addEventListener('input',()=>{n.body=t.innerText.replace(/\n{3,}/g,'\n\n').trim();save();});
  const tg=$('[data-tags]',r);tg&&tg.addEventListener('input',()=>{n.tags=tg.innerText.split(/[,，、\n]/).map(x=>x.trim()).filter(Boolean);save();});
  r.querySelectorAll('[data-img]').forEach(el=>{el.classList.add('eimg');el.title='点击更换图片';el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();pickImage(el.dataset.img,()=>openNote(i));});});}
 $('.rclose',r).onclick=()=>{history.pushState('',document.title,location.pathname+location.search);closeReader();if(EDIT)render();};
 if(location.hash!=='#note/'+i)history.pushState(null,'','#note/'+i);}
/* ---------- 编辑模式（仅 ?edit=1） ---------- */
function save(){localStorage.setItem(LS,JSON.stringify(S));flash();}
let ft;function flash(){const b=$('#ebar .st');if(b){b.textContent='已自动保存 '+new Date().toLocaleTimeString();clearTimeout(ft);}}
function download(name,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/javascript'}));a.download=name;document.body.appendChild(a);a.click();a.remove();}
function exportJS(data){const d=JSON.parse(JSON.stringify(data||S));(d.articles||[]).forEach(a=>delete a.uploaded);return '/* 网站全部内容。由编辑模式导出于 '+new Date().toLocaleString()+'。\n * 用它替换 assets/content.js 即可。字段说明见 README 的「编辑指南」。 */\nwindow.SITE = '+JSON.stringify(d,null,2)+';\n';}
function articleJS(id,html){return '/* 文章正文，可直接修改 HTML。注意保留首尾两行 */\n(window.ARTICLES=window.ARTICLES||{})['+JSON.stringify(id)+']=`\n'+String(html).replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${')+'\n`;\n';}
function armEdit(){
 document.body.classList.add('editing');
 bindEdit(document);
 document.querySelectorAll('#main [data-img],#nav [data-img],#heroInner [data-img]').forEach(el=>{el.classList.add('eimg');el.title='点击更换图片';el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();pickImage(el.dataset.img);});});
}
function bindEdit(root){
 root.querySelectorAll('[data-p]').forEach(el=>{if(el.dataset.eb)return;el.dataset.eb=1;el.contentEditable=true;el.spellcheck=false;
  el.addEventListener('click',e=>{if(el.closest('a'))e.preventDefault();});
  el.addEventListener('input',()=>{set(el.dataset.p,el.innerText.replace(/\n$/,''));if(el.dataset.p==='contact.email')el.href='mailto:'+el.innerText;save();});
  if(/^articles\.\d+\.date$/.test(el.dataset.p))el.addEventListener('blur',()=>render());
  el.addEventListener('keydown',e=>{if(e.key==='Enter'&&!/paragraphs|headline|lead|desc|summary|problem|highlight|improve|question|feeling|verdict/.test(el.dataset.p)){e.preventDefault();el.blur();}});});
}
function pickImage(path,after){const f=document.createElement('input');f.type='file';f.accept='image/*';f.onchange=()=>{const file=f.files[0];if(!file)return;const rd=new FileReader();rd.onload=()=>{set(path,rd.result);save();render();after&&after();};rd.readAsDataURL(file);};f.click();}
document.addEventListener('click',e=>{if(!editing)return;
 const b=e.target.closest('.ectl button');if(b){e.preventDefault();e.stopPropagation();const w=b.parentNode,list=get(w.dataset.list),i=+w.dataset.i,a=b.dataset.act;
  if(a==='edit'){window.UPLOAD&&window.UPLOAD.open(list[i].id);return;}
  if(a==='del'){if(!confirm('删除这一项？'))return;const gone=list.splice(i,1)[0];if(w.dataset.list==='articles'&&gone)delBody(gone.id);}else{const j=a==='up'?i-1:i+1;if(j<0||j>=list.length)return;[list[i],list[j]]=[list[j],list[i]];}save();render();return;}
 if(e.target.closest('[data-up]')){e.preventDefault();window.UPLOAD&&window.UPLOAD.open();return;}
 const ad=e.target.closest('.eadd');if(ad){e.preventDefault();get(ad.dataset.list).push(tplFor(ad.dataset.list,ad.dataset.type));if(ad.dataset.list==='notes'){window.__nf='全部';notePage=999;}save();render();}});
document.addEventListener('change',e=>{if(editing&&e.target.dataset.bool){set(e.target.dataset.bool,e.target.checked);save();render();}});
function editBar(){const bar=document.createElement('div');bar.id='ebar';
 bar.innerHTML=`<b>编辑模式</b><span class="st">点任意文字直接修改，自动保存在本浏览器</span><button data-a="sec">板块设置</button><button data-a="pack" title="打包 content.js 和新文章，下载一个压缩包">导出更新包</button><button data-a="exp">只导出 content.js</button><button data-a="reset">重置</button><a href="${location.pathname}">退出预览</a>`;
 document.body.appendChild(bar);
 bar.addEventListener('click',e=>{const a=e.target.dataset.a;if(!a)return;
  if(a==='pack')window.UPLOAD&&window.UPLOAD.exportPack();
  if(a==='exp'){const n=Object.keys(UP).length+Object.keys(artOverrides).length;if(n&&!confirm('有 '+n+' 篇文章的正文不在 content.js 里（上传或改过的文章），只导出 content.js 会漏掉它们。\n建议改用「导出更新包」。仍然只导出 content.js？'))return;download('content.js',exportJS());}
  if(a==='reset'&&confirm('放弃所有未导出的修改（包括上传的文章），恢复为 content.js 的内容？')){localStorage.removeItem(LS);localStorage.removeItem(LSA);localStorage.removeItem(LSB);clearBodies().finally(()=>location.reload());}
  if(a==='sec')secPanel();});}
function secPanel(){let p=$('#epanel');if(p){p.remove();return;}p=document.createElement('div');p.id='epanel';
 const draw=()=>{p.innerHTML='<h4>板块顺序与显示</h4>'+S.sections.map((s,i)=>`<div class="erow"><span>${esc(s.num)}</span><label><input type="checkbox" data-k="visible" data-i="${i}" ${s.visible?'checked':''}>显示</label><label><input type="checkbox" data-k="dark" data-i="${i}" ${s.dark?'checked':''}>深色底</label><button data-m="-1" data-i="${i}">↑</button><button data-m="1" data-i="${i}">↓</button></div>`).join('');};
 draw();document.body.appendChild(p);
 p.addEventListener('change',e=>{const s=S.sections[e.target.dataset.i];s[e.target.dataset.k]=e.target.checked;save();render();});
 p.addEventListener('click',e=>{const m=+e.target.dataset.m;if(!m)return;const i=+e.target.dataset.i,j=i+m;if(j<0||j>=S.sections.length)return;[S.sections[i],S.sections[j]]=[S.sections[j],S.sections[i]];save();render();draw();});}
if(EDIT){editBar();syncBanner();
 window.SITE_EDIT={get S(){return S},UP,artOverrides,upReady,putBody,delBody,save,render,loadArticle,openReader,exportJS,articleJS,esc,pad,dkey,PER,
  setPage(p){artPage=p},get storage(){return idb?'indexeddb':'localstorage'}};
 const sc=document.createElement('script');sc.src='assets/upload.js';document.head.appendChild(sc);}

/* 小实验：点卡片原地放大成浮层（iframe 内运行），再点缩小回卡片；不跳转、不刷新、保留滚动位置 */
const XO=(()=>{let ov,pan,fr,cur=null,busy=false;const RM=matchMedia('(prefers-reduced-motion:reduce)');
 function build(){ov=document.createElement('div');ov.id='xov';ov.innerHTML='<div class="xbd"></div><div class="xpan" role="dialog" aria-modal="true" aria-label="小实验"><div class="xhd"><b class="xt"></b><span class="xtg"></span><a class="xnew" target="_blank" rel="noopener">新窗口打开 ↗</a><button class="xcl" type="button" aria-label="缩小">缩小 <span>✕</span></button></div><div class="xfr"><img class="xph" alt=""><div class="xld"><i></i>正在打开…</div></div></div>';
  document.body.appendChild(ov);pan=ov.querySelector('.xpan');fr=ov.querySelector('.xfr');
  ov.querySelector('.xbd').onclick=req;ov.querySelector('.xcl').onclick=req;}
 const rectOf=el=>el&&el.getBoundingClientRect();
 function fly(from,to,dur,done){if(RM.matches||!from||!from.width){pan.style.transform='';done&&done();return;}
  pan.style.transition='none';pan.style.transformOrigin='0 0';
  const T=(r)=>{const P=pan.getBoundingClientRect();return `translate(${r.left-P.left}px,${r.top-P.top}px) scale(${r.width/P.width},${r.height/P.height})`;};
  pan.style.transform=from==='self'?'':T(from);void pan.offsetWidth;
  pan.style.transition=`transform ${dur}ms cubic-bezier(.2,.8,.2,1),border-radius ${dur}ms`;pan.style.transform=to==='self'?'':T(to);
  let ok=false;const end=()=>{if(ok)return;ok=true;pan.removeEventListener('transitionend',end);done&&done();};pan.addEventListener('transitionend',end);setTimeout(end,dur+80);}
 function open(i,src){if(busy||cur)return;const x=S.experiments[i];if(!x||!x.link)return;if(!ov)build();busy=true;
  const card=document.querySelectorAll('#lab .exp .shot')[i]||src;cur={i,card,y:scrollY};
  ov.querySelector('.xt').textContent=x.title;ov.querySelector('.xtg').textContent=x.tag||'';ov.querySelector('.xnew').href=x.link;
  const ph=ov.querySelector('.xph');ph.src=x.image||'';ph.style.display=x.image?'':'none';ov.classList.add('open','show');fr.classList.remove('ready');
  document.body.classList.add('noscroll');document.documentElement.classList.add('xopen');
  try{history.pushState({xov:1},'',location.href);}catch(e){}
  fly(rectOf(card),'self',520,()=>{busy=false;load(x.link);ov.querySelector('.xcl').focus({preventScroll:true});});}
 function load(link){const f=document.createElement('iframe');f.title=S.experiments[cur.i].title;f.setAttribute('allow','microphone; autoplay; fullscreen; clipboard-read; clipboard-write');f.setAttribute('allowfullscreen','');
  f.src=link+(link.includes('?')?'&':'?')+'embed=1';f.onload=()=>{fr.classList.add('ready');try{f.contentWindow.addEventListener('keydown',e=>{if(e.key==='Escape')req();});f.contentWindow.focus();}catch(e){}};fr.appendChild(f);}
 function close(){if(!cur||busy)return;busy=true;const f=fr.querySelector('iframe');if(f){try{f.src='about:blank';}catch(e){}f.remove();}fr.classList.remove('ready');
  ov.classList.remove('show');const c=cur;scrollTo(0,c.y);
  fly('self',rectOf(c.card),420,()=>{ov.classList.remove('open');pan.style.transition='none';pan.style.transform='';document.body.classList.remove('noscroll');document.documentElement.classList.remove('xopen');scrollTo(0,c.y);cur=null;busy=false;
   const g=c.card;g&&g.focus&&g.focus({preventScroll:true});});}
 function req(){if(!cur)return;if(history.state&&history.state.xov)history.back();else close();}
 addEventListener('popstate',()=>{if(cur)close();});
 addEventListener('keydown',e=>{if(e.key==='Escape'&&cur)req();});
 document.addEventListener('click',e=>{const a=e.target.closest('a[data-x]');if(!a||EDIT||editing||e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;e.preventDefault();open(+a.dataset.x,a);});
 return {open,close,get cur(){return cur}};})();
window.__XO=XO;
render();route();
})();

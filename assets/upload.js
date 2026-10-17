/* 编辑模式专用：「上传文章」弹窗 + 「导出更新包」。只在 ?edit=1 时加载，普通访客不会下载。
 * 依赖 assets/vendor/ 里的 mammoth（读 Word）、marked（读 Markdown）、fflate（打 zip 包）。 */
(function(){
const E=window.SITE_EDIT;if(!E)return;
const $=(s,r=document)=>r.querySelector(s), esc=E.esc, pad=E.pad;
const COVER_MAX=500*1024, IMG_MAX=400*1024, DIM=1600;

/* ---------- 第三方库按需加载 ---------- */
const libs={};
function lib(name,file){return libs[name]||(libs[name]=new Promise((ok,no)=>{if(window[name])return ok(window[name]);
 const s=document.createElement('script');s.src='assets/vendor/'+file;s.onload=()=>window[name]?ok(window[name]):no(new Error(file));s.onerror=()=>{libs[name]=null;no(new Error('缺少 assets/vendor/'+file));};document.head.appendChild(s);}));}
const getMammoth=()=>lib('mammoth','mammoth.browser.min.js'), getMarked=()=>lib('marked','marked.umd.js'), getZip=()=>lib('fflate','fflate.min.js');

/* ---------- 日期 / 摘要 ---------- */
const today=()=>{const d=new Date();return d.getFullYear()+'.'+pad(d.getMonth()+1)+'.'+pad(d.getDate());};
function normDate(v){const m=String(v||'').trim().match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D*$/);if(!m)return null;const y=+m[1],mo=+m[2],d=+m[3];if(mo<1||mo>12||d<1||d>31)return null;return y+'.'+pad(mo)+'.'+pad(d);}
function autoSummary(html){const b=new DOMParser().parseFromString('<div>'+html+'</div>','text/html').body;const ps=[...b.querySelectorAll('p,li,blockquote')].filter(x=>!x.querySelector('p')).map(x=>x.textContent.trim()).filter(Boolean);const t=(ps.length?ps.join(' '):b.textContent).replace(/\s+/g,' ').trim();return t.length>60?t.slice(0,60)+'…':t;}

/* ---------- HTML 清洗：只保留段落、标题、加粗、列表、引用、图片、链接、表格 ---------- */
const DROP=new Set('SCRIPT STYLE IFRAME FRAME OBJECT EMBED FORM INPUT BUTTON SELECT TEXTAREA SVG NOSCRIPT TEMPLATE META LINK HEAD TITLE CANVAS VIDEO AUDIO MATH BASE'.split(' '));
const KEEP={P:'p',BR:'br',H1:'h2',H2:'h2',H3:'h3',H4:'h3',H5:'h3',H6:'h3',STRONG:'strong',B:'strong',EM:'em',I:'em',U:'u',S:'s',DEL:'s',STRIKE:'s',BLOCKQUOTE:'blockquote',UL:'ul',OL:'ol',LI:'li',A:'a',IMG:'img',HR:'hr',PRE:'pre',CODE:'code',TABLE:'table',THEAD:'thead',TBODY:'tbody',TR:'tr',TD:'td',TH:'th',FIGURE:'figure',FIGCAPTION:'figcaption',SUP:'sup',SUB:'sub'};
const BLOCKS=new Set('P H1 H2 H3 H4 H5 H6 UL OL TABLE BLOCKQUOTE DIV SECTION ARTICLE FIGURE PRE HR HEADER FOOTER MAIN ASIDE CENTER LI'.split(' '));
const CONTAINERS=new Set('DIV SECTION ARTICLE MAIN HEADER FOOTER ASIDE CENTER NAV BODY HTML'.split(' '));
const INLINE_OUT=new Set(['strong','em','u','s','a','code','sup','sub','br','img','#text']);
function okSrc(u){u=String(u||'').trim();return /^data:image\/(png|jpe?g|gif|webp|bmp);base64,/i.test(u)||/^https?:\/\//i.test(u);}
function sanitize(html){
 const doc=new DOMParser().parseFromString(String(html||''),'text/html'),out=document.createElement('div');
 const walk=(node,parent)=>{for(const n of [...node.childNodes]){
  if(n.nodeType===3){if(n.nodeValue)parent.appendChild(document.createTextNode(n.nodeValue.replace(/\u00a0/g,' ')));continue;}
  if(n.nodeType!==1)continue;const tag=n.tagName.toUpperCase();if(DROP.has(tag))continue;
  if(KEEP[tag]){const el=document.createElement(KEEP[tag]);
   if(tag==='A'){const h=n.getAttribute('href')||'';if(/^(https?:|mailto:)/i.test(h.trim())){el.href=h.trim();el.target='_blank';el.rel='noopener';}else{walk(n,parent);continue;}}
   if(tag==='IMG'){let src=n.getAttribute('src')||'';const ds=n.getAttribute('data-src')||n.getAttribute('data-original')||'';if((!okSrc(src)||/^data:image\/svg/i.test(src))&&okSrc(ds))src=ds;if(!okSrc(src))continue;el.setAttribute('src',src.trim());el.setAttribute('alt',n.getAttribute('alt')||'');if(/^https?:/i.test(src))el.setAttribute('referrerpolicy','no-referrer');parent.appendChild(el);continue;}
   if(tag==='TD'||tag==='TH'){['colspan','rowspan'].forEach(k=>{const v=n.getAttribute(k);if(v&&/^\d+$/.test(v))el.setAttribute(k,v);});}
   walk(n,el);parent.appendChild(el);continue;}
  if(CONTAINERS.has(tag)){const hasBlock=[...n.querySelectorAll('*')].some(c=>BLOCKS.has(c.tagName.toUpperCase())||c.tagName==='IMG');
   if(hasBlock)walk(n,parent);else{const p=document.createElement('p');walk(n,p);parent.appendChild(p);}continue;}
  // span / font 等行内标签：保留加粗、斜体，其余去壳
  const st=n.getAttribute&&(n.getAttribute('style')||'');let tgt=parent;
  if(/font-weight\s*:\s*(bold|[6-9]00)/i.test(st)){const b=document.createElement('strong');parent.appendChild(b);tgt=b;}
  if(/font-style\s*:\s*italic/i.test(st)){const i=document.createElement('em');tgt.appendChild(i);tgt=i;}
  walk(n,tgt);}};
 walk(doc.body,out);
 // 顶层散落的文字和行内元素包成段落
 const fixed=document.createElement('div');let cur=null;
 for(const n of [...out.childNodes]){const name=n.nodeType===3?'#text':n.tagName.toLowerCase();
  if(INLINE_OUT.has(name)){if(name==='#text'&&!n.nodeValue.trim()&&!cur)continue;if(name==='br'&&!cur)continue;if(!cur){cur=document.createElement('p');fixed.appendChild(cur);}cur.appendChild(n);}
  else{cur=null;fixed.appendChild(n);}}
 // 清掉空段落、空加粗、重复加粗
 fixed.querySelectorAll('strong strong, em em').forEach(x=>x.replaceWith(...x.childNodes));
 for(let k=0;k<3;k++)fixed.querySelectorAll('p,strong,em,u,s,h2,h3,li,blockquote,figure,figcaption').forEach(x=>{if(!x.textContent.trim()&&!x.querySelector('img'))x.remove();});
 fixed.querySelectorAll('p').forEach(p=>{while(p.firstChild&&p.firstChild.nodeName==='BR')p.firstChild.remove();while(p.lastChild&&p.lastChild.nodeName==='BR')p.lastChild.remove();});
 return fixed.innerHTML.replace(/\s{2,}/g,' ').trim();}
function textToHTML(t){t=String(t||'').replace(/\r\n?/g,'\n').trim();if(!t)return '';
 const parts=/\n\s*\n/.test(t)?t.split(/\n\s*\n/):t.split('\n');
 return parts.map(x=>x.trim()).filter(Boolean).map(x=>'<p>'+esc(x).replace(/\n/g,'<br>')+'</p>').join('');}

/* ---------- 图片压缩 ---------- */
const bytesOf=u=>{const i=u.indexOf(',');return Math.floor((u.length-i-1)*3/4);};
const loadImg=(src,cors)=>new Promise((ok,no)=>{const im=new Image();if(cors)im.crossOrigin='anonymous';im.onload=()=>ok(im);im.onerror=()=>no(new Error('图片打不开'));setTimeout(()=>no(new Error('超时')),12000);im.src=src;});
async function shrink(src,max,dim=DIM){
 const im=await loadImg(src,/^https?:/i.test(src));const w0=im.naturalWidth,h0=im.naturalHeight;
 if(/^data:/.test(src)&&bytesOf(src)<=max&&Math.max(w0,h0)<=dim*1.25)return src;
 let sc=Math.min(1,dim/Math.max(w0,h0)),q=.86,out='';const c=document.createElement('canvas'),x=c.getContext('2d');
 for(let k=0;k<14;k++){c.width=Math.max(1,Math.round(w0*sc));c.height=Math.max(1,Math.round(h0*sc));x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);
  out=c.toDataURL('image/jpeg',q);if(bytesOf(out)<=max)break;if(q>.62)q-=.12;else sc*=.8;}
 return out;}
const fileToDataURL=f=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(r.error);r.readAsDataURL(f);});
// 把正文里的图片都处理好：大图压缩；外链图尽量转存（不允许时保留外链）
async function processImages(html,onProg){const box=document.createElement('div');box.innerHTML=html;const imgs=[...box.querySelectorAll('img')];let i=0,bad=0,remote=0;
 for(const im of imgs){i++;onProg&&onProg(`正在处理图片 ${i}/${imgs.length}…`);const src=im.getAttribute('src');
  try{const n=await shrink(src,IMG_MAX);im.setAttribute('src',n);im.removeAttribute('referrerpolicy');}
  catch(e){if(/^https?:/i.test(src)){remote++;im.setAttribute('referrerpolicy','no-referrer');}else{bad++;im.remove();}}}
 return {html:box.innerHTML,bad,remote,count:imgs.length};}

/* ---------- 文件导入 ---------- */
async function readFile(f){const name=f.name.toLowerCase(),ext=name.split('.').pop();let html='',title='';
 if(ext==='docx'){const m=await getMammoth();const r=await m.convertToHtml({arrayBuffer:await f.arrayBuffer()},{convertImage:m.images.imgElement(img=>img.read('base64').then(b=>({src:'data:'+img.contentType+';base64,'+b})))});html=r.value;}
 else if(ext==='md'||ext==='markdown'){const t=await f.text();const mk=await getMarked();const h=t.match(/^\s*#\s+(.+)\s*$/m);if(h&&/^\s*#\s/.test(t.trimStart().split('\n')[0])){title=h[1].trim();html=mk.parse(t.trimStart().split('\n').slice(1).join('\n'));}else html=mk.parse(t);}
 else if(ext==='txt'){html=textToHTML(await f.text());}
 else if(ext==='html'||ext==='htm'){const t=await f.text();const d=new DOMParser().parseFromString(t,'text/html');const h1=d.querySelector('h1');title=(h1&&h1.textContent.trim())||(d.title||'').trim();if(h1)h1.remove();html=d.body.innerHTML;}
 else if(ext==='doc')throw new Error('不支持老版 .doc，请在 Word 里「另存为 .docx」再导入');
 else throw new Error('不支持这种文件，请用 .docx / .md / .txt / .html');
 html=sanitize(html);
 if(!title&&ext==='docx'){const b=document.createElement('div');b.innerHTML=html;const f1=b.firstElementChild;if(f1&&f1.tagName==='H2'&&f1.textContent.trim().length<60){title=f1.textContent.trim();f1.remove();html=b.innerHTML;}}
 if(!title)title=f.name.replace(/\.[^.]+$/,'');
 return {html,title};}

/* ---------- 弹窗 ---------- */
let M=null,cur=null; // cur: {id, isNew, cover}
function modal(){if(M)return M;M=document.createElement('div');M.id='umodal';M.className='um-wrap';M.setAttribute('role','dialog');M.setAttribute('aria-modal','true');
 M.innerHTML=`<div class="um-box"><div class="um-head"><h3 class="um-ttl">上传文章</h3><button class="um-x" aria-label="关闭">✕</button></div>
<div class="um-body">
 <label class="um-f"><span>标题 <i>*</i></span><input id="u-title" placeholder="文章标题" autocomplete="off"></label>
 <div class="um-row"><label class="um-f"><span>日期 <i>*</i></span><input id="u-date" placeholder="2026.10.17" autocomplete="off"><small>格式：2026.10.17，列表按日期自动排序</small></label>
  <div class="um-f"><span>封面图（可选）</span><div class="um-cover"><div class="um-cv"><img alt="" hidden><b>未选择</b></div><div><button type="button" class="um-btn" data-u="cover">选择图片</button> <button type="button" class="um-btn ghost" data-u="uncover" hidden>移除</button><small>自动压缩到 500KB 以内</small></div></div></div></div>
 <label class="um-f"><span>摘要（可选）</span><textarea id="u-sum" rows="2" placeholder="不填会自动取正文前 60 个字"></textarea></label>
 <div class="um-f"><span>正文 <i>*</i></span>
  <div class="um-tools"><button type="button" class="um-btn" data-u="file">从文件导入</button><small>支持 Word（.docx）、Markdown（.md）、纯文本（.txt）、网页（.html）。<br>也可以把公众号或网页里的文章全选复制，直接粘贴到下面的框里（会保留段落、小标题、加粗和图片）。</small></div>
  <div id="u-body" class="um-ed rtext" contenteditable="true" data-ph="在这里粘贴或输入正文…（也可以把文件直接拖进来）"></div>
  <div class="um-st" aria-live="polite"></div></div>
</div>
<div class="um-foot"><button type="button" class="um-btn ghost danger" data-u="del" hidden>删除本文</button><span class="um-sp"></span><button type="button" class="um-btn ghost" data-u="cancel">取消</button><button type="button" class="um-btn solid" data-u="save">保存文章</button></div></div>`;
 document.body.appendChild(M);
 const body=$('#u-body',M);
 M.addEventListener('click',e=>{if(e.target===M)return close();const a=e.target.closest('[data-u]');if(e.target.closest('.um-x'))return close();if(!a)return;const u=a.dataset.u;
  if(u==='cancel')close();if(u==='file')pickFile();if(u==='cover')pickCover();if(u==='uncover')setCover('');if(u==='save')saveArt();if(u==='del')delArt();});
 M.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}});
 body.addEventListener('paste',onPaste);
 M.addEventListener('dragover',e=>{e.preventDefault();M.classList.add('drag');});M.addEventListener('dragleave',e=>{if(e.target===M)M.classList.remove('drag');});
 M.addEventListener('drop',e=>{e.preventDefault();M.classList.remove('drag');const f=e.dataTransfer.files[0];if(!f)return;if(/^image\//.test(f.type))setCoverFile(f);else importFile(f);});
 return M;}
const st=(t,err)=>{const s=$('.um-st',M);s.textContent=t||'';s.classList.toggle('err',!!err);};
let busy=false;const setBusy=b=>{busy=b;M.classList.toggle('busy',b);$('[data-u="save"]',M).disabled=b;};
async function open(id){const m=modal();const S=E.S;const a=id&&S.articles.find(x=>x.id===id);
 cur={id:a?a.id:null,isNew:!a,cover:a?(a.cover||''):''};
 $('.um-ttl',m).textContent=a?'编辑文章':'上传文章';$('#u-title',m).value=a?a.title.replace(/^待填写：.*/,''):'';$('#u-date',m).value=a?(normDate(a.date)||a.date||today()):today();
 $('#u-sum',m).value=a&&!/^待填写/.test(a.summary||'')?(a.summary||''):'';$('#u-body',m).innerHTML='';$('[data-u="del"]',m).hidden=!a;setCover(cur.cover);st('');
 m.classList.add('open');document.body.classList.add('noscroll');
 if(a){st('正在读取正文…');const h=await E.loadArticle(a.id);$('#u-body',m).innerHTML=/还没有正文|正文为空/.test(h)?'':h;st('');}
 setTimeout(()=>$('#u-title',m).focus(),30);}
function close(){if(!M)return;M.classList.remove('open');if(!$('#reader').classList.contains('open'))document.body.classList.remove('noscroll');}
function setCover(src){cur.cover=src||'';const im=$('.um-cv img',M);im.hidden=!src;if(src)im.src=src;else im.removeAttribute('src');$('.um-cv b',M).hidden=!!src;$('[data-u="uncover"]',M).hidden=!src;}
async function setCoverFile(f){try{st('正在压缩封面…');setCover(await shrink(await fileToDataURL(f),COVER_MAX));st('封面已就绪');}catch(e){st('这张图片打不开，换一张试试',true);}}
function pickCover(){const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=()=>i.files[0]&&setCoverFile(i.files[0]);i.click();}
function pickFile(){const i=document.createElement('input');i.type='file';i.accept='.docx,.md,.markdown,.txt,.html,.htm';i.onchange=()=>i.files[0]&&importFile(i.files[0]);i.click();}
async function importFile(f){const body=$('#u-body',M);if(body.textContent.trim()&&!confirm('用「'+f.name+'」替换框里现有的正文？'))return;
 setBusy(true);st('正在读取 '+f.name+'…');
 try{const r=await readFile(f);const p=await processImages(r.html,st);body.innerHTML=p.html;if(!$('#u-title',M).value.trim())$('#u-title',M).value=r.title;
  st('已导入「'+f.name+'」'+(p.count?`，含 ${p.count} 张图片`:'')+(p.bad?`，有 ${p.bad} 张格式不支持已跳过`:'')+'。可以在框里继续修改。');}
 catch(e){st('导入失败：'+e.message,true);}finally{setBusy(false);}}
async function onPaste(e){const cd=e.clipboardData;if(!cd)return;e.preventDefault();
 const html=cd.getData('text/html'),text=cd.getData('text/plain');const files=[...cd.files||[]].filter(f=>/^image\//.test(f.type));
 let out='';
 if(html)out=sanitize(html);
 else if(files.length){for(const f of files)out+=`<p><img src="${await fileToDataURL(f)}" alt=""></p>`;}
 else out=textToHTML(text);
 if(!out)return;
 if(/<img/i.test(out)){setBusy(true);try{const p=await processImages(out,st);out=p.html;st(p.remote?`粘贴完成。有 ${p.remote} 张图片来源网站不允许转存，保留了原图链接（原网站删图后会失效）。`:'粘贴完成');}finally{setBusy(false);}}
 $('#u-body',M).focus();document.execCommand('insertHTML',false,out);}
function newId(date){const d=String(date).replace(/\D/g,'');return 'a'+d+'-'+Math.random().toString(36).slice(2,6);}
async function saveArt(){if(busy)return;
 const title=$('#u-title',M).value.trim(),date=normDate($('#u-date',M).value),bodyEl=$('#u-body',M);
 if(!title){st('请填写标题',true);$('#u-title',M).focus();return;}
 if(!date){st('日期格式不对，请写成 2026.10.17 这样',true);$('#u-date',M).focus();return;}
 let html=sanitize(bodyEl.innerHTML);if(!html.replace(/<[^>]+>/g,'').trim()&&!/<img/.test(html)){st('正文是空的：请粘贴正文，或点「从文件导入」',true);return;}
 {const b=document.createElement('div');b.innerHTML=html;const f1=b.firstElementChild;if(f1&&/^H[23]$/.test(f1.tagName)&&f1.textContent.trim()===title){f1.remove();html=b.innerHTML;}}
 setBusy(true);
 try{const p=await processImages(html,st);html=p.html;
  const summary=$('#u-sum',M).value.trim()||autoSummary(html);const S=E.S;let a;
  if(cur.isNew){a={id:newId(date),date,cover:cur.cover,title,summary,uploaded:true};S.articles.push(a);}
  else{a=S.articles.find(x=>x.id===cur.id);Object.assign(a,{date,cover:cur.cover,title,summary});}
  await E.putBody(a.id,html);E.save();
  // 跳到这篇所在的页并高亮
  const order=S.articles.slice().sort((x,y)=>E.dkey(y.date)-E.dkey(x.date));E.setPage(Math.floor(order.indexOf(a)/E.PER)+1);
  close();E.render();const row=document.querySelector(`.arow[data-open="${CSS.escape(a.id)}"]`);
  if(row){row.scrollIntoView({block:'center'});row.classList.add('uflash');setTimeout(()=>row.classList.remove('uflash'),2400);}
  toast((cur.isNew?'已上传':'已保存')+'「'+title+'」。现在只存在这个浏览器里，记得点底部「导出更新包」。');}
 catch(e){st(/quota/i.test(e&&e.name+e.message)?'浏览器存储空间满了：请减少图片，或先「导出更新包」放好文件后点「重置」':'保存失败：'+(e.message||e),true);}
 finally{setBusy(false);}}
async function delArt(){const S=E.S,i=S.articles.findIndex(x=>x.id===cur.id);if(i<0)return;if(!confirm('删除「'+S.articles[i].title+'」？'))return;
 const a=S.articles.splice(i,1)[0];await E.delBody(a.id);E.save();close();E.render();toast('已删除');}
function toast(t){let x=$('#utoast');if(!x){x=document.createElement('div');x.id='utoast';document.body.appendChild(x);}x.textContent=t;x.classList.add('on');clearTimeout(x._t);x._t=setTimeout(()=>x.classList.remove('on'),4200);}

/* ---------- 导出更新包（zip，目录结构和网站一样） ---------- */
function dataURLtoBytes(u){const m=u.match(/^data:([^;,]+)(;base64)?,(.*)$/);const ext=({'image/jpeg':'jpg','image/jpg':'jpg','image/png':'png','image/gif':'gif','image/webp':'webp','image/bmp':'bmp','image/svg+xml':'svg'})[m[1].toLowerCase()]||'bin';
 const raw=m[2]?atob(m[3]):decodeURIComponent(m[3]);const b=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)b[i]=raw.charCodeAt(i)&255;return {b,ext};}
const enc=t=>new TextEncoder().encode(t);
async function buildPack(){await E.upReady;const zl=await getZip();const S=JSON.parse(JSON.stringify(E.S));const d=today().replace(/\./g,''),root='zouyue-site-update-'+d+'/';
 const files={},bodies=Object.assign({},E.artOverrides,E.UP),list=[];
 for(const a of S.articles){const dir='assets/articles/'+a.id+'/';let n=0,touched=false;
  if(/^data:/.test(a.cover||'')){const {b,ext}=dataURLtoBytes(a.cover);files[root+dir+'cover.'+ext]=b;a.cover=dir+'cover.'+ext;touched=true;}
  if(bodies[a.id]!=null){const box=document.createElement('div');box.innerHTML=bodies[a.id];
   box.querySelectorAll('img[src^="data:"]').forEach(im=>{const {b,ext}=dataURLtoBytes(im.getAttribute('src'));const fn=pad(++n)+'.'+ext;files[root+dir+fn]=b;im.setAttribute('src',dir+fn);im.setAttribute('loading','lazy');});
   files[root+'assets/articles/'+a.id+'.js']=enc(E.articleJS(a.id,box.innerHTML));touched=true;}
  if(touched)list.push(a);}
 files[root+'assets/content.js']=enc(E.exportJS(S));
 files[root+'放置说明.txt']=enc(guide(root.slice(0,-1),list).replace(/\n/g,'\r\n'));
 return {zip:zl.zipSync(files,{level:6}),name:root.slice(0,-1)+'.zip',list,root};}
function guide(folder,list){return `网站更新包（${today()} 导出）

这个压缩包里的文件夹结构和网站完全一样：
  assets/content.js            网站全部文字（含新文章的标题、日期、摘要）
  assets/articles/<编号>.js     新文章或改过的文章正文
  assets/articles/<编号>/       这篇文章里的图片和封面
${list.length?'\n本次包含的文章：\n'+list.map(a=>`  · ${a.date}  ${a.title}（编号 ${a.id}）`).join('\n')+'\n':''}
怎么放（三选一）：

方法 A：最省事
  把这个压缩包直接发给我（Grok Bot），我帮你放好并发布。

方法 B：自己拖文件（Mac 访达）
  1. 双击压缩包解压，得到文件夹「${folder}」。
  2. 打开它里面的 assets 文件夹，把 content.js 拖进你网站文件夹 zouyue-site/assets/ 里，提示重名时选「替换」。
  3. 打开它里面的 assets/articles 文件夹，按 Command+A 全选，拖进网站的 zouyue-site/assets/articles/ 里，提示重名时选「替换」。
  注意：不要把整个 assets 文件夹拖过去替换，那样会把网站其他文件删掉。

方法 C：终端一行命令（自动合并，不会删任何文件）
  ditto ~/Downloads/${folder} ~/Downloads/zouyue-site
  （如果文件夹不在「下载」里，把路径换成实际位置。）

放好以后：
  · 重新打开 index.html 看看文章是否正常。
  · 确认无误后，在编辑模式底部点「重置」，清掉浏览器里的草稿（否则浏览器会继续显示草稿版本）。
  · 要上线到 melodyzpm.com，还需要重新发布网站。
`;}
async function exportPack(){try{toast('正在打包…');const p=await buildPack();
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([p.zip],{type:'application/zip'}));a.download=p.name;document.body.appendChild(a);a.click();a.remove();
 const t=$('#utoast');t&&t.classList.remove('on');info(p);}catch(e){alert('打包失败：'+(e.message||e));}}
function info(p){
 let box=$('#uinfo');if(!box){box=document.createElement('div');box.id='uinfo';box.className='um-wrap';document.body.appendChild(box);}
 const folder=p.root.slice(0,-1);
 box.innerHTML=`<div class="um-box um-small"><div class="um-head"><h3>更新包已下载</h3><button class="um-x" aria-label="关闭">✕</button></div><div class="um-body um-guide">
<p>文件名：<b>${esc(p.name)}</b>（在「下载」文件夹里）。${p.list.length?`里面有 ${p.list.length} 篇文章的正文和图片，以及最新的 content.js。`:'里面是最新的 content.js（没有新文章）。'}</p>
<h4>怎么放到网站文件夹里</h4>
<ol><li><b>最省事：</b>把压缩包直接发给我，我帮你放好并发布。</li>
<li><b>自己拖：</b>解压后，把里面 <code>assets/content.js</code> 拖进网站的 <code>zouyue-site/assets/</code>；再打开里面的 <code>assets/articles</code>，全选拖进网站的 <code>zouyue-site/assets/articles/</code>。提示重名就选「替换」。<br><span class="um-warn">不要把整个 assets 文件夹拖过去替换，会删掉网站其他文件。</span></li>
<li><b>终端一行命令（自动合并）：</b><code class="um-cmd">ditto ~/Downloads/${esc(folder)} ~/Downloads/zouyue-site</code></li></ol>
<p class="um-note">放好并确认网站正常后，再点底部「重置」清掉浏览器草稿。压缩包里也有一份「放置说明.txt」。</p></div>
<div class="um-foot"><span class="um-sp"></span><button type="button" class="um-btn solid um-ok">知道了</button></div></div>`;
 box.classList.add('open');box.onclick=e=>{if(e.target===box||e.target.closest('.um-x,.um-ok'))box.classList.remove('open');};}

window.UPLOAD={open,exportPack,buildPack,sanitize,readFile};
})();

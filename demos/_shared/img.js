// 图片小工具：读图、转格式/压缩/缩放、提取主色
window.loadImg=src=>new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=j;i.src=src});
window.imgTo=(img,type,q,w)=>new Promise(r=>{const s=w&&w<img.naturalWidth?w/img.naturalWidth:1,c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*s);c.height=Math.round(img.naturalHeight*s);const x=c.getContext('2d');if(type==='image/jpeg'){x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height)}x.drawImage(img,0,0,c.width,c.height);c.toBlob(r,type,q)});
window.mainColors=(img,k=6)=>{const c=document.createElement('canvas'),n=64;c.width=n;c.height=n;const x=c.getContext('2d');x.drawImage(img,0,0,n,n);const d=x.getImageData(0,0,n,n).data,m={};
 for(let i=0;i<d.length;i+=4){if(d[i+3]<128)continue;const key=(d[i]>>4)+','+(d[i+1]>>4)+','+(d[i+2]>>4);const e=m[key]||(m[key]=[0,0,0,0]);e[0]+=d[i];e[1]+=d[i+1];e[2]+=d[i+2];e[3]++}
 const hx=v=>Math.round(v).toString(16).padStart(2,'0');const out=[];
 for(const e of Object.values(m).sort((a,b)=>b[3]-a[3])){const c=[e[0]/e[3],e[1]/e[3],e[2]/e[3]];if(out.some(o=>Math.abs(o[0]-c[0])+Math.abs(o[1]-c[1])+Math.abs(o[2]-c[2])<60))continue;out.push(c);if(out.length>=k)break}
 return out.map(c=>'#'+c.map(hx).join(''))};
window.imgTools=(box,img,name,origSize)=>{const base=(name||'image').replace(/\.[^.]+$/,'');
 box.innerHTML=`<img class="prev" src="${img.src}"><div class="kv" style="margin-top:14px"><div><span>尺寸</span><b>${img.naturalWidth}×${img.naturalHeight}</b></div>${origSize?`<div><span>大小</span><b>${fmtSize(origSize)}</b></div>`:''}</div>
 <p class="hint" style="margin-top:16px">主色（点击复制）</p><div class="sw">${mainColors(img).map(c=>`<i style="background:${c}" data-c="${c}"></i>`).join('')}</div>
 <div class="row" style="margin-top:34px"><select class="fmt"><option value="image/webp">WebP</option><option value="image/png">PNG</option><option value="image/jpeg">JPG</option></select>
 <span class="hint">质量</span><input class="q" type="range" min="30" max="100" value="80"><span class="hint qv">80</span>
 <span class="hint">宽度</span><input class="w" type="number" min="16" max="${img.naturalWidth}" value="${img.naturalWidth}" style="width:90px"></div>
 <div class="row"><button class="btn pri go">转换并下载</button><span class="hint out"></span></div>`;
 box.querySelectorAll('.sw i').forEach(i=>i.onclick=()=>copy(i.dataset.c));
 const q=box.querySelector('.q');q.oninput=()=>box.querySelector('.qv').textContent=q.value;
 const run=async(save)=>{const t=box.querySelector('.fmt').value,b=await imgTo(img,t,q.value/100,+box.querySelector('.w').value);
  box.querySelector('.out').textContent='结果 '+fmtSize(b.size)+(origSize?'（'+(b.size<origSize?'小了 '+Math.round((1-b.size/origSize)*100)+'%':'比原图大 '+Math.round((b.size/origSize-1)*100)+'%')+'）':'');
  if(save)dl(b,base+'.'+{'image/webp':'webp','image/png':'png','image/jpeg':'jpg'}[t])};
 box.querySelector('.go').onclick=()=>run(true);[q,box.querySelector('.fmt'),box.querySelector('.w')].forEach(e=>e.addEventListener('change',()=>run(false)));run(false);};

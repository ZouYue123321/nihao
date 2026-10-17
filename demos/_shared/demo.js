// 统一顶栏（Logo + 返回）与底部致谢。用法：<script src="../_shared/demo.js" data-name="项目名" data-license="MIT" data-repo="https://github.com/..."></script>
(function(){var s=document.currentScript,d=s.dataset;function go(){
var b=document.createElement('div');b.className='mz-bar';b.innerHTML='<a href="../../index.html#lab" aria-label="MelodyZ 首页"><img src="../../assets/logo/melodyz-white.svg" alt="MelodyZ"></a><a class="back" href="../../index.html#lab">← 返回</a>';document.body.appendChild(b);
if(d.noCredit)return;var c=document.createElement('div');c.className='mz-credit';c.innerHTML='基于 <a href="'+d.repo+'" target="_blank" rel="noopener">'+d.name+'</a> 开源项目改编 · '+d.license;document.body.appendChild(c);}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',go):go();})();

/* ============================================
   交互脚本：打字机 / 导航高亮 / 滚动动画 / 像素背景
   ============================================ */

// ---------- 1. Hero 打字机效果 ----------
(function typewriter() {
  const el = document.getElementById('typewriter');
  const words = ['让 AI 真正落地 ✦', '把想法变成产品 ✦', '用数据驱动迭代 ✦'];
  let wordIdx = 0;
  let charIdx = 0;
  let deleting = false;

  function tick() {
    const word = words[wordIdx];
    if (!deleting) {
      charIdx++;
      el.textContent = word.slice(0, charIdx);
      if (charIdx === word.length) {
        deleting = true;
        setTimeout(tick, 1500);
        return;
      }
    } else {
      charIdx--;
      el.textContent = word.slice(0, charIdx);
      if (charIdx === 0) {
        deleting = false;
        wordIdx = (wordIdx + 1) % words.length;
      }
    }
    setTimeout(tick, deleting ? 60 : 120);
  }
  tick();
})();

// ---------- 2. 导航高亮 + 滚动进入视口动画 ----------
(function scrollEffects() {
  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('.nav-item');

  // 为可动画元素添加 reveal 类
  document.querySelectorAll(
    '.about-card, .skills-grid, .projects-grid, .contact-card, .skill-tag, .project-card'
  ).forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (i % 6) * 60 + 'ms';
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.15 }
  );
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

  // 导航高亮
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navItems.forEach((item) => {
            item.classList.toggle(
              'active',
              item.getAttribute('href') === '#' + id
            );
          });
        }
      });
    },
    { rootMargin: '-40% 0px -55% 0px' }
  );
  sections.forEach((s) => navObserver.observe(s));
})();

// ---------- 3. 像素飘落背景（Canvas） ----------
(function pixelBackground() {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  const palette = ['#ff7eb6', '#4ecdc4', '#ffd93d', '#a06cd5', '#ff9f43', '#6ac46a'];
  const cell = 12; // 像素块大小
  let particles = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // 生成飘落像素点
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 0.4 + Math.random() * 1.2,
      color: palette[Math.floor(Math.random() * palette.length)],
      alpha: 0.15 + Math.random() * 0.35,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, cell, cell);
      ctx.globalAlpha = 1;
      p.y += p.speed;
      if (p.y > canvas.height + cell) {
        p.y = -cell;
        p.x = Math.random() * canvas.width;
      }
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

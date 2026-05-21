/* ============================================================
   PERIOD RAGS — SCRIPT.JS
   Navigation · Period Bird Game · Period Çark · Lightbox
   ============================================================ */

'use strict';

/* ============================================================
   SPA NAVIGATION
   ============================================================ */
let currentPage = 'home';
let birdGame = null;
let wheelGame = null;

function navigateTo(pageId) {
  if (currentPage === pageId) return;

  // Stop game if leaving mini games
  if (currentPage === 'minigames' && birdGame) {
    birdGame.destroy();
    birdGame = null;
  }

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Show target
  const target = document.getElementById('page-' + pageId);
  if (!target) return;
  target.classList.add('active');
  currentPage = pageId;

  // Update nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === pageId);
  });

  // Close mobile nav
  const navLinks = document.getElementById('navLinks');
  const hamburger = document.getElementById('navHamburger');
  navLinks.classList.remove('open');
  hamburger.classList.remove('open');

  // Scroll top
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Page-specific init
  if (pageId === 'minigames') {
    requestAnimationFrame(() => initPeriodBird());
    loadLeaderboard();
  }
  if (pageId === 'wheel') {
    requestAnimationFrame(() => initWheel());
  }
  if (pageId === 'admin') {
    adminRenderList();
  }
  if (pageId === 'myprizes') {
    loadMyPrizes();
  }
  if (pageId === 'events') {
    renderDynamicEvents();
  }
  if (pageId === 'gallery') {
    renderGallery();
  }
}

/* NAV LINKS click handler */
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(link.dataset.page);
  });
});

/* HAMBURGER */
document.getElementById('navHamburger').addEventListener('click', () => {
  const nav = document.getElementById('navLinks');
  const btn = document.getElementById('navHamburger');
  nav.classList.toggle('open');
  btn.classList.toggle('open');
});

/* NAVBAR scroll shadow */
window.addEventListener('scroll', () => {
  const nb = document.getElementById('navbar');
  nb.style.boxShadow = window.scrollY > 10
    ? '0 4px 20px rgba(0,0,0,0.7)'
    : 'none';
});

/* ============================================================
   MENU TABS
   ============================================================ */
document.querySelectorAll('.menu-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabId = tab.dataset.tab;

    // Update tab buttons
    document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update panels
    document.querySelectorAll('.menu-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('tab-' + tabId);
    if (panel) panel.classList.add('active');
  });
});

/* ============================================================
   GALLERY LIGHTBOX
   ============================================================ */
function openLightbox(src) {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  img.src = src;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.classList.remove('open');
  document.body.style.overflow = '';
}

// Gallery items click
document.querySelectorAll('.gallery-item').forEach(item => {
  item.addEventListener('click', () => {
    const src = item.dataset.src;
    if (src) openLightbox(src);
  });
});

// Close lightbox on click outside image
document.getElementById('lightbox').addEventListener('click', e => {
  if (e.target === document.getElementById('lightbox')) closeLightbox();
});

// ESC key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
});

/* ============================================================
   PERIOD BIRD — FLAPPY BIRD GAME
   ============================================================ */

class PeriodBirdGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    // Internal resolution — DPR aware for sharp rendering
    this.W = 1000;
    this.H = 580;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.W * dpr;
    this.canvas.height = this.H * dpr;
    this.canvas.style.width = this.W + 'px';
    this.canvas.style.height = this.H + 'px';
    this.ctx.scale(dpr, dpr);

    // Game state
    this.state = 'idle'; // idle | playing | gameover

    // Bird
    this.bird = {
      x: 160,
      y: this.H / 2,
      w: 170,
      h: 100,
      vy: 0,
    };

    // Physics — düşük gravity = süzülme hissi
    this.gravity = 0.10;
    this.jumpForce = -5.0;
    this.maxFall = 3.5;

    // Pipes
    this.pipes = [];
    this.pipeW = 130;
    this.pipeGap = 300;
    this.pipeSpeed = 1.8;
    this.pipeTimer = 0;
    this.pipeInterval = 175;

    // Background scroll
    this.bgX = 0;
    this.bgScrollSpeed = 0.35;

    // Score
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem('periodBirdBest') || '0');
    this._updateScoreDisplay();

    // Animation
    this.animFrame = null;
    this.birdWingAngle = 0;
    this.birdWingDir = 1;

    // Images
    this.imgs = { bird: null, bg: null, pipe: null };
    this.imgsReady = 0;
    this.totalImgs = 3;

    this._loadImages();
    this._bindEvents();

    // Initial draw
    this._waitAndDraw();
  }

  _waitAndDraw() {
    const wait = () => {
      if (this.imgsReady >= this.totalImgs) {
        this._drawIdle();
      } else {
        setTimeout(wait, 60);
      }
    };
    wait();
  }

  _loadImages() {
    const load = (key, src) => {
      const img = new Image();
      img.onload = () => { this.imgsReady++; };
      img.onerror = () => { this.imgsReady++; };
      img.src = src;
      this.imgs[key] = img;
    };
    load('bird', './yeni logolar/Period bir uçağı.png');
    load('bg',   './period bird/Arka plan şehir  gece görseli.png');
    load('pipe', './period bird/boru.png');
  }

  _bindEvents() {
    this._keyHandler = (e) => {
      if (e.code === 'Space') { e.preventDefault(); this._handleInput(); }
    };
    this._clickHandler = (e) => { e.preventDefault(); this._handleInput(); };
    this._touchHandler = (e) => { e.preventDefault(); this._handleInput(); };

    document.addEventListener('keydown', this._keyHandler);
    this.canvas.addEventListener('click', this._clickHandler);
    this.canvas.addEventListener('touchstart', this._touchHandler, { passive: false });
  }

  _handleInput() {
    if (this.state === 'idle') {
      this._startGame();
    } else if (this.state === 'playing') {
      this.bird.vy = this.jumpForce;
    } else if (this.state === 'gameover') {
      this.restart();
    }
  }

  _startGame() {
    this.state = 'playing';
    this.bird.y = this.H / 2;
    this.bird.vy = -2.5; // başlangıçta hafif yukarı — anında düşmesin
    this.pipes = [];
    this.score = 0;
    this.pipeTimer = 0;
    this.bgX = 0;
    this._updateScoreDisplay();

    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    if (startBtn) startBtn.style.display = 'none';
    if (restartBtn) restartBtn.style.display = 'none';

    this._gameLoop();
  }

  _gameLoop() {
    this._update();
    this._draw();
    if (this.state === 'playing') {
      this.animFrame = requestAnimationFrame(() => this._gameLoop());
    }
  }

  _update() {
    if (this.state !== 'playing') return;

    // Bird physics
    this.bird.vy = Math.min(this.bird.vy + this.gravity, this.maxFall);
    this.bird.y += this.bird.vy;

    // Wing animation
    this.birdWingAngle += 0.15 * this.birdWingDir;
    if (Math.abs(this.birdWingAngle) > 0.3) this.birdWingDir *= -1;

    // Boundary — hit top or bottom
    if (this.bird.y + this.bird.h > this.H) {
      this.bird.y = this.H - this.bird.h;
      this._gameOver();
      return;
    }
    if (this.bird.y < 0) {
      this.bird.y = 0;
      this._gameOver();
      return;
    }

    // Scroll background
    this.bgX = (this.bgX - this.bgScrollSpeed);
    if (this.bgX <= -this.W) this.bgX = 0;

    // Spawn pipes — her boru farklı aralık ve gap boyutuyla gelsin
    this.pipeTimer++;
    if (this.pipeTimer >= this.pipeInterval) {
      // Sonraki boruya kadar rastgele aralık
      this.pipeInterval = 140 + Math.floor(Math.random() * 80); // 140–220 frame arası
      this.pipeTimer = 0;

      // Gap boyutu skora göre küçülür (min 200, başlangıç 300)
      const dynGap = Math.max(200, this.pipeGap - this.score * 3);

      // Son borunun konumuna göre gapTop belirle — ani zıplamaları sınırla
      const lastPipe = this.pipes[this.pipes.length - 1];
      const lastGapTop = lastPipe ? lastPipe.gapTop : this.H / 2 - dynGap / 2;
      const minGapTop = 70;
      const maxGapTop = this.H - dynGap - 70;
      // Önceki konumdan max ±130px sapma
      const lo = Math.max(minGapTop, lastGapTop - 130);
      const hi = Math.min(maxGapTop, lastGapTop + 130);
      const gapTop = lo + Math.random() * (hi - lo);

      // Score arttıkça yavaşça hızlan
      const speed = Math.min(3.2, this.pipeSpeed + this.score * 0.04);

      this.pipes.push({ x: this.W + 10, gapTop, passed: false, speed });
    }

    // Update pipes
    const toRemove = [];
    for (let i = 0; i < this.pipes.length; i++) {
      const p = this.pipes[i];
      p.x -= (p.speed || this.pipeSpeed);

      // Score: pipe fully passed
      if (!p.passed && p.x + this.pipeW < this.bird.x) {
        p.passed = true;
        this.score++;
        this._updateScoreDisplay();
        this._checkBestScore();
      }

      // Collision (with small hitbox margin)
      const margin = 28;
      const bx1 = this.bird.x + margin;
      const bx2 = this.bird.x + this.bird.w - margin;
      const by1 = this.bird.y + margin;
      const by2 = this.bird.y + this.bird.h - margin;

      const px1 = p.x;
      const px2 = p.x + this.pipeW;

      if (bx2 > px1 && bx1 < px2) {
        const gapBottom = p.gapTop + this.pipeGap;
        if (by1 < p.gapTop || by2 > gapBottom) {
          this._gameOver();
          return;
        }
      }

      if (p.x + this.pipeW < -20) toRemove.push(i);
    }
    // Remove off-screen pipes (reverse to keep indices)
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.pipes.splice(toRemove[i], 1);
    }
  }

  _draw() {
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;

    // Background
    const bgImg = this.imgs.bg;
    if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
      ctx.drawImage(bgImg, this.bgX, 0, W, H);
      ctx.drawImage(bgImg, this.bgX + W, 0, W, H);
    } else {
      // Fallback gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#050310');
      grad.addColorStop(0.4, '#0a0520');
      grad.addColorStop(1, '#150808');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // Draw pipes
    const pipeImg = this.imgs.pipe;
    for (const p of this.pipes) {
      const gapBottom = p.gapTop + this.pipeGap;

      const overshoot = 30; // borular canvas dışına taşsın — ucu görünmesin
      if (pipeImg && pipeImg.complete && pipeImg.naturalWidth > 0) {
        // Top pipe — flip vertically, overshoot top edge
        ctx.save();
        const topH = p.gapTop + overshoot;
        ctx.translate(p.x + this.pipeW / 2, (p.gapTop - overshoot) / 2);
        ctx.scale(1, -1);
        ctx.drawImage(pipeImg, -this.pipeW / 2, -topH / 2, this.pipeW, topH);
        ctx.restore();

        // Bottom pipe — overshoot bottom edge
        const botH = H - gapBottom + overshoot;
        ctx.drawImage(pipeImg, p.x, gapBottom, this.pipeW, botH);
      } else {
        // Fallback pipe rectangles
        ctx.fillStyle = '#6b1a1a';
        ctx.strokeStyle = '#cc0000';
        ctx.lineWidth = 2;
        // Top pipe (overshoot top)
        ctx.fillRect(p.x, -overshoot, this.pipeW, p.gapTop + overshoot);
        ctx.strokeRect(p.x, -overshoot, this.pipeW, p.gapTop + overshoot);
        // Top pipe cap
        ctx.fillRect(p.x - 4, p.gapTop - 18, this.pipeW + 8, 18);
        ctx.strokeRect(p.x - 4, p.gapTop - 18, this.pipeW + 8, 18);
        // Bottom pipe (overshoot bottom)
        ctx.fillRect(p.x, gapBottom, this.pipeW, H - gapBottom + overshoot);
        ctx.strokeRect(p.x, gapBottom, this.pipeW, H - gapBottom + overshoot);
        // Bottom pipe cap
        ctx.fillRect(p.x - 4, gapBottom, this.pipeW + 8, 18);
        ctx.strokeRect(p.x - 4, gapBottom, this.pipeW + 8, 18);
      }
    }

    // Draw bird
    const birdImg = this.imgs.bird;
    ctx.save();
    const birdCX = this.bird.x + this.bird.w / 2;
    const birdCY = this.bird.y + this.bird.h / 2;
    ctx.translate(birdCX, birdCY);

    // Rotate based on velocity — hafif, süzülme hissi
    const rot = Math.max(-Math.PI / 8, Math.min(Math.PI / 5, this.bird.vy * 0.038));
    ctx.rotate(rot);

    if (birdImg && birdImg.complete && birdImg.naturalWidth > 0) {
      ctx.drawImage(birdImg, -this.bird.w / 2, -this.bird.h / 2, this.bird.w, this.bird.h);
    } else {
      // Fallback plane
      ctx.fillStyle = '#cc0000';
      ctx.fillRect(-this.bird.w / 2, -this.bird.h / 2, this.bird.w, this.bird.h);
      ctx.fillStyle = '#ff6666';
      ctx.font = 'bold 12px Oswald, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PERIOD BIRD', 0, 4);
    }
    ctx.restore();

    // State overlays
    if (this.state === 'idle') {
      this._drawIdleOverlay(ctx, W, H);
    } else if (this.state === 'gameover') {
      this._drawGameOverOverlay(ctx, W, H);
    }
  }

  _drawIdle() {
    this._draw();
    this._drawIdleOverlay(this.ctx, this.W, this.H);
  }

  _drawIdleOverlay(ctx, W, H) {
    ctx.fillStyle = 'rgba(5,3,8,0.58)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(204,0,0,0.9)';
    ctx.font = 'bold 11px Oswald, sans-serif';
    ctx.letterSpacing = '0.2em';
    ctx.fillText('OYNAMAK İÇİN AŞAĞIDAKİ BUTONA TIKLA', W / 2, H / 2 - 12);
    ctx.fillStyle = 'rgba(220,210,195,0.55)';
    ctx.font = '10px Oswald, sans-serif';
    ctx.fillText('VEYA SPACE / CANVAS\'A TIKLA', W / 2, H / 2 + 12);
  }

  _drawGameOverOverlay(ctx, W, H) {
    ctx.fillStyle = 'rgba(5,3,3,0.72)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';

    // GAME OVER title
    ctx.fillStyle = '#cc0000';
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(204,0,0,0.8)';
    ctx.font = 'bold 52px "Metal Mania", serif';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 50);
    ctx.shadowBlur = 0;

    // Score
    ctx.fillStyle = '#e0d0c0';
    ctx.font = 'bold 22px Oswald, sans-serif';
    ctx.fillText('PUAN: ' + this.score, W / 2, H / 2 + 4);

    // Best score
    if (this.score >= this.bestScore && this.score > 0) {
      ctx.fillStyle = '#c9a227';
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(201,162,39,0.7)';
      ctx.font = 'bold 18px Oswald, sans-serif';
      ctx.fillText('★ YENİ REKOR! ★', W / 2, H / 2 + 36);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#6a5a4a';
      ctx.font = '14px Oswald, sans-serif';
      ctx.fillText('EN İYİ: ' + this.bestScore, W / 2, H / 2 + 36);
    }
  }

  _gameOver() {
    if (this.state === 'gameover') return;
    this.state = 'gameover';
    cancelAnimationFrame(this.animFrame);
    this.animFrame = null;

    this._checkBestScore();
    this._draw();

    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) restartBtn.style.display = 'inline-flex';

    // Supabase'e skor kaydet (giriş yapılmışsa)
    if (_currentUser && this.score > 0) {
      sbSaveScore(_currentUser.username, this.score)
        .then(() => loadLeaderboard())
        .catch(() => {});
    }
  }

  _checkBestScore() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('periodBirdBest', this.bestScore);
      const el = document.getElementById('bestScore');
      if (el) el.textContent = this.bestScore;
    }
  }

  _updateScoreDisplay() {
    const cs = document.getElementById('currentScore');
    const bs = document.getElementById('bestScore');
    if (cs) cs.textContent = this.score;
    if (bs) bs.textContent = this.bestScore;
  }


  restart() {
    // Önceki loop'u kesin durdur
    cancelAnimationFrame(this.animFrame);
    this.animFrame = null;

    // Sıfırla
    this.score = 0;
    this.pipes = [];
    this.pipeTimer = 0;
    this.bgX = 0;
    this.bird.y = this.H / 2;
    this.bird.vy = -2.5;
    this.state = 'playing';
    this._updateScoreDisplay();

    const restartBtn = document.getElementById('restartBtn');
    const startBtn = document.getElementById('startBtn');
    if (restartBtn) restartBtn.style.display = 'none';
    if (startBtn) startBtn.style.display = 'none';

    this._gameLoop();
  }

  destroy() {
    cancelAnimationFrame(this.animFrame);
    document.removeEventListener('keydown', this._keyHandler);
    this.canvas.removeEventListener('click', this._clickHandler);
    this.canvas.removeEventListener('touchstart', this._touchHandler);
  }
}

function initPeriodBird() {
  if (birdGame) {
    birdGame.destroy();
    birdGame = null;
  }
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  if (startBtn) startBtn.style.display = 'inline-flex';
  if (restartBtn) restartBtn.style.display = 'none';
  birdGame = new PeriodBirdGame();
}

function startPeriodBird() {
  if (!birdGame) birdGame = new PeriodBirdGame();
  const startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.style.display = 'none';
  // Simulate space press to start
  if (birdGame.state === 'idle') birdGame._startGame();
}

function restartPeriodBird() {
  if (birdGame) birdGame.restart();
}

async function loadLeaderboard() {
  const lb = document.getElementById('leaderboardList');
  if (!lb) return;
  try {
    const scores = await sbGetLeaderboard();
    if (!scores.length) {
      lb.innerHTML = '<p class="lb-note" style="color:var(--text-dim)">Henüz skor yok. İlk sen ol!</p>';
      return;
    }
    lb.innerHTML = scores.map((s, i) => `
      <div class="lb-item ${i === 0 ? 'lb-top' : ''}">
        <span class="lb-rank">${i + 1}.</span>
        <span class="lb-name">${s.username.toUpperCase()}</span>
        <span class="lb-score">${Number(s.score).toLocaleString()}</span>
      </div>
    `).join('');
  } catch(e) {
    lb.innerHTML = '<p class="lb-note" style="color:var(--text-dim)">Yüklenemedi.</p>';
  }
}

/* ============================================================
   PERIOD ÇARK — SPIN WHEEL
   ============================================================ */

class PeriodWheel {
  constructor() {
    // Dilimler saat yönünde, tepedeki kafatası sınırından başlayarak:
    // 0=Tanışalım mı Kokteyl (22.5°), 1=Bira (67.5°), 2=5.000$ (112.5°),
    // 3=%50 İndirim (157.5°), 4=Bedava Bira (202.5°), 5=Premium Viski (247.5°),
    // 6=Büyük Ödül Nightblade (292.5°), 7=Adri Special (337.5°)
    this.prizes = [
      { label: 'Tanışalım mı Kokteyl',  weight: 3,     icon: '🍹', rarity: 'ÇOK ZOR'              },
      { label: 'Bira',                  weight: 14.99, icon: '🍺', rarity: ''                      },
      { label: '5.000$',               weight: 0.01,  icon: '💵', rarity: 'NEREDEYSE İMKANSIZ'    },
      { label: '%50 İndirim',           weight: 47,    icon: '%',  rarity: 'EN ÇOK ÇIKAN'          },
      { label: 'Bedava Bira',           weight: 22,    icon: '🍺', rarity: ''                      },
      { label: 'Premium Viski',         weight: 10,    icon: '🥃', rarity: 'ZOR'                   },
      { label: 'Büyük Ödül Nightblade', weight: 0,     icon: '🏍', rarity: 'İMKANSIZ'             },
      { label: 'Adri Special',          weight: 3,     icon: '⭐', rarity: 'AŞIRI ZOR'             },
    ];

    this.numPrizes  = this.prizes.length; // 8
    this.sliceAngle = 360 / this.numPrizes; // 45°
    this.currentRotation = 0; // birikimli saat yönü dönüş (derece)
    this.spinning = false;

    this.container = document.getElementById('wheelImgContainer');
  }

  _pickWinner() {
    const totalWeight = this.prizes.reduce((s, p) => s + p.weight, 0);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < this.prizes.length; i++) {
      r -= this.prizes[i].weight;
      if (r <= 0) return i;
    }
    // fallback: ilk pozitif ağırlıklı dilim
    return this.prizes.findIndex(p => p.weight > 0);
  }

  spin() {
    if (this.spinning || !this.container) return;
    this.spinning = true;

    const spinBtn = document.getElementById('spinBtn');
    const resultBox = document.getElementById('wheelResultBox');
    if (spinBtn) spinBtn.disabled = true;
    if (resultBox) resultBox.style.display = 'none';

    document.querySelectorAll('.prize-row').forEach(row => {
      row.style.borderLeftColor = '';
      row.style.background = '';
    });

    const winnerIndex = this._pickWinner();

    // CSS rotate(θ) saat yönünde θ derece döndürür.
    // rotate(θ) sonrası tepede (0°) gösterilen dilim: orijinal görüntüde (360-θ)°'de olanlar.
    // Dilim i merkezi orijinal görüntüde: i*45+22.5°
    // Dilim i'yi tepeye getirmek için: θ = 360 - (i*45+22.5)
    const winnerCenter = winnerIndex * this.sliceAngle + this.sliceAngle / 2;
    const targetBase   = (360 - winnerCenter + 360) % 360;

    const currentMod = ((this.currentRotation % 360) + 360) % 360;
    let delta = (targetBase - currentMod + 360) % 360;
    if (delta < 1) delta += 360; // en az 1 tam tur fazladan

    const extraSpins   = 5 + Math.floor(Math.random() * 4); // 5–8 tam tur
    const finalRotation = this.currentRotation + extraSpins * 360 + delta;
    const duration      = 4500 + Math.random() * 1500; // 4.5–6 sn

    this.container.style.transition = `transform ${duration}ms cubic-bezier(0.17,0.67,0.12,0.99)`;
    this.container.style.transform  = `rotate(${finalRotation}deg)`;
    this.currentRotation = finalRotation;

    setTimeout(() => {
      this.spinning = false;
      this.container.style.transition = 'none';
      this._onSpinEnd(spinBtn, resultBox, winnerIndex);
    }, duration + 80);
  }

  _onSpinEnd(spinBtn, resultBox, winnerIndex, onSaved) {
    const winner = this.prizes[winnerIndex];

    if (resultBox) {
      resultBox.style.display = 'block';
      const el = document.getElementById('wheelResultText');
      if (el) el.textContent = winner.label;
    }

    document.querySelectorAll('.prize-row').forEach((row, i) => {
      if (i === winnerIndex) {
        row.style.borderLeftColor = '#cc0000';
        row.style.background = 'rgba(204,0,0,0.18)';
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    if (onSaved) onSaved(winner);
    if (spinBtn) setTimeout(() => { spinBtn.disabled = false; }, 3000);
  }

  spinAsync(onSaved) {
    if (this.spinning || !this.container) return;
    this.spinning = true;

    const spinBtn = document.getElementById('spinBtn');
    const resultBox = document.getElementById('wheelResultBox');
    if (spinBtn) spinBtn.disabled = true;
    if (resultBox) resultBox.style.display = 'none';

    document.querySelectorAll('.prize-row').forEach(row => {
      row.style.borderLeftColor = '';
      row.style.background = '';
    });

    const winnerIndex = this._pickWinner();

    const winnerCenter  = winnerIndex * this.sliceAngle + this.sliceAngle / 2;
    const targetBase    = (360 - winnerCenter + 360) % 360;
    const currentMod    = ((this.currentRotation % 360) + 360) % 360;
    let delta           = (targetBase - currentMod + 360) % 360;
    if (delta < 1) delta += 360;

    const extraSpins    = 5 + Math.floor(Math.random() * 4);
    const finalRotation = this.currentRotation + extraSpins * 360 + delta;
    const duration      = 4500 + Math.random() * 1500;

    this.container.style.transition = `transform ${duration}ms cubic-bezier(0.17,0.67,0.12,0.99)`;
    this.container.style.transform  = `rotate(${finalRotation}deg)`;
    this.currentRotation = finalRotation;

    setTimeout(() => {
      this.spinning = false;
      this.container.style.transition = 'none';
      this._onSpinEnd(spinBtn, resultBox, winnerIndex, onSaved);
    }, duration + 80);
  }
}

function initWheel() {
  if (!wheelGame) wheelGame = new PeriodWheel();
  _refreshWheelStatus();
}

async function _refreshWheelStatus() {
  const statusEl = document.getElementById('wheelStatusMsg');
  const spinBtn  = document.getElementById('spinBtn');
  if (!statusEl || !spinBtn) return;

  if (!_currentUser) {
    statusEl.style.display = 'block';
    statusEl.className = 'wheel-status-msg wheel-status-warn';
    statusEl.textContent = 'Çarkı döndürmek için giriş yapman gerekiyor.';
    spinBtn.disabled = true;
    return;
  }

  try {
    const existing = await sbCheckWeeklySpin(_currentUser.username);
    if (existing) {
      const d = new Date(existing.spun_at);
      const nextSpin = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
      const diff = nextSpin - Date.now();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      statusEl.style.display = 'block';
      statusEl.className = 'wheel-status-msg wheel-status-warn';
      statusEl.textContent = `Bu hafta çevirmişsin. ${days} gün sonra tekrar deneyebilirsin.`;
      spinBtn.disabled = true;
    } else {
      statusEl.style.display = 'none';
      spinBtn.disabled = false;
    }
  } catch {
    statusEl.style.display = 'none';
    spinBtn.disabled = false;
  }
}

async function spinWheel() {
  if (!wheelGame) wheelGame = new PeriodWheel();

  const statusEl = document.getElementById('wheelStatusMsg');
  const spinBtn  = document.getElementById('spinBtn');

  if (!_currentUser) {
    openAuthModal('login');
    return;
  }

  if (spinBtn) spinBtn.disabled = true;

  try {
    const existing = await sbCheckWeeklySpin(_currentUser.username);
    if (existing) {
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.className = 'wheel-status-msg wheel-status-warn';
        const d = new Date(existing.spun_at);
        const nextSpin = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
        const days = Math.ceil((nextSpin - Date.now()) / (1000 * 60 * 60 * 24));
        statusEl.textContent = `Bu hafta çevirmişsin. ${days} gün sonra tekrar deneyebilirsin.`;
      }
      return;
    }
  } catch { /* izin ver */ }

  wheelGame.spinAsync(async (winner) => {
    if (!_currentUser) return;
    try {
      const spinData = await sbSaveWheelSpin(_currentUser.username, winner.label);
      showPrizeCodePopup(winner, spinData.code);
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.className = 'wheel-status-msg wheel-status-ok';
        statusEl.textContent = `Tebrikler! Ödülün: ${winner.label}`;
      }
    } catch(err) {
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.className = 'wheel-status-msg wheel-status-warn';
        statusEl.textContent = 'Ödül kaydedilemedi: ' + err.message;
      }
    }
  });
}

/* ============================================================
   PRIZE CODE POPUP
   ============================================================ */
function showPrizeCodePopup(winner, code) {
  const icons = { '🍹':true, '🍺':true, '💵':true, '🥃':true, '🏍':true, '⭐':true, '%':true };
  document.getElementById('prizePopupIcon').textContent = winner.icon || '🎉';
  document.getElementById('prizePopupName').textContent = winner.label;
  document.getElementById('prizePopupCode').textContent = code;
  document.getElementById('prizePopupCopyBtn').textContent = '📋';
  document.getElementById('prizePopupOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePrizePopup() {
  document.getElementById('prizePopupOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function copyPrizeCode() {
  const code = document.getElementById('prizePopupCode').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('prizePopupCopyBtn');
    btn.textContent = '✓';
    setTimeout(() => btn.textContent = '📋', 1800);
  }).catch(() => {
    const range = document.createRange();
    range.selectNode(document.getElementById('prizePopupCode'));
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  });
}

/* ============================================================
   ÖDÜLLERİM SAYFASI
   ============================================================ */
async function loadMyPrizes() {
  if (!_currentUser) {
    document.getElementById('myPrizesActive').innerHTML =
      '<p class="admin-empty-note">Ödüllerini görmek için giriş yapman gerekiyor.</p>';
    document.getElementById('myPrizesUsed').innerHTML = '';
    return;
  }
  document.getElementById('myPrizesActive').innerHTML = '<p class="admin-empty-note">Yükleniyor...</p>';
  try {
    const spins = await sbGetUserSpins(_currentUser.username);
    const active = spins.filter(s => !s.verified);
    const used   = spins.filter(s => s.verified);
    _renderMyPrizesList('myPrizesActive', active, false);
    _renderMyPrizesList('myPrizesUsed',   used,   true);
  } catch(err) {
    document.getElementById('myPrizesActive').innerHTML =
      `<p class="admin-empty-note">Yüklenemedi: ${err.message}</p>`;
  }
}

function _renderMyPrizesList(containerId, spins, isUsed) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!spins.length) {
    el.innerHTML = `<p class="admin-empty-note">${isUsed ? 'Henüz kullanılan ödül yok.' : 'Aktif kodun yok.'}</p>`;
    return;
  }
  el.innerHTML = spins.map(s => {
    const date = new Date(s.spun_at).toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' });
    return `
      <div class="myprize-card ${isUsed ? 'myprize-used' : ''}">
        <div class="myprize-info">
          <span class="myprize-name">${s.prize}</span>
          <span class="myprize-date">${date}</span>
          ${isUsed ? '<span class="myprize-verified-badge">✓ KULLANILDI</span>' : ''}
        </div>
        <div class="myprize-code-row">
          <span class="myprize-code">${s.code}</span>
          ${!isUsed ? `<button class="myprize-copy-btn" onclick="copyText('${s.code}', this)">📋</button>` : ''}
        </div>
      </div>`;
  }).join('');
}

function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✓';
    setTimeout(() => btn.textContent = '📋', 1800);
  }).catch(() => {});
}

function switchMyPrizesTab(tab) {
  document.querySelectorAll('.myprizes-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.getElementById('myPrizesActive').style.display = tab === 'active' ? '' : 'none';
  document.getElementById('myPrizesUsed').style.display   = tab === 'used'   ? '' : 'none';
}

/* ============================================================
   ADMIN — KODLAR TAB
   ============================================================ */
async function loadAdminKodlar() {
  const pendingEl  = document.getElementById('adminSpinsPending');
  const verifiedEl = document.getElementById('adminSpinsVerified');
  if (!pendingEl || !verifiedEl) return;
  pendingEl.innerHTML  = '<p class="admin-empty-note">Yükleniyor...</p>';
  verifiedEl.innerHTML = '<p class="admin-empty-note">Yükleniyor...</p>';
  try {
    const all = await sbGetAllSpins();
    const pending  = all.filter(s => !s.verified);
    const verified = all.filter(s =>  s.verified);
    _renderAdminSpins(pendingEl,  pending,  false);
    _renderAdminSpins(verifiedEl, verified, true);
  } catch(err) {
    pendingEl.innerHTML = `<p class="admin-empty-note">Hata: ${err.message}</p>`;
  }
}

function _renderAdminSpins(el, spins, isVerified) {
  if (!spins.length) {
    el.innerHTML = `<p class="admin-empty-note">${isVerified ? 'Onaylanan ödül yok.' : 'Bekleyen ödül yok.'}</p>`;
    return;
  }
  el.innerHTML = spins.map(s => {
    const date = new Date(s.spun_at).toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' });
    const verDate = s.verified_at ? new Date(s.verified_at).toLocaleDateString('tr-TR', { day:'numeric', month:'long' }) : '';
    return `
      <div class="admin-spin-item ${isVerified ? 'spin-verified' : ''}">
        <div class="admin-spin-info">
          <span class="admin-spin-user">${s.username}</span>
          <span class="admin-spin-prize">${s.prize}</span>
          <span class="admin-spin-date">${date}</span>
          ${isVerified ? `<span class="admin-spin-vdate">✓ ${verDate}</span>` : ''}
        </div>
        <div class="admin-spin-code">${s.code}</div>
        ${!isVerified
          ? `<button class="admin-btn-verify" onclick="adminVerifyCode('${s.code}')">ONAYLA</button>`
          : ''}
      </div>`;
  }).join('');
}

let _adminFoundSpin = null;

async function adminLookupCode() {
  const q = document.getElementById('adminVerifyInput').value.trim();
  const resultEl = document.getElementById('adminVerifyResult');
  if (!q) return;
  resultEl.innerHTML = '<p class="admin-empty-note">Aranıyor...</p>';
  _adminFoundSpin = null;
  try {
    const spin = await sbLookupSpin(q);
    if (!spin) {
      resultEl.innerHTML = '<p class="admin-empty-note" style="color:var(--red)">Kod veya kullanıcı bulunamadı.</p>';
      return;
    }
    _adminFoundSpin = spin;
    const date = new Date(spin.spun_at).toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' });
    resultEl.innerHTML = `
      <div class="admin-lookup-result ${spin.verified ? 'lookup-verified' : ''}">
        <div class="alr-row"><span class="alr-label">Kullanıcı</span><span class="alr-val">${spin.username}</span></div>
        <div class="alr-row"><span class="alr-label">Ödül</span><span class="alr-val">${spin.prize}</span></div>
        <div class="alr-row"><span class="alr-label">Kod</span><span class="alr-val code-mono">${spin.code}</span></div>
        <div class="alr-row"><span class="alr-label">Tarih</span><span class="alr-val">${date}</span></div>
        <div class="alr-row"><span class="alr-label">Durum</span><span class="alr-val ${spin.verified ? 'status-ok' : 'status-pend'}">${spin.verified ? '✓ ONAYLANDI' : '⏳ BEKLİYOR'}</span></div>
        ${!spin.verified ? `<button class="admin-btn-verify alr-btn" onclick="adminVerifyFoundCode()">KODU ONAYLA</button>` : ''}
      </div>`;
  } catch(err) {
    resultEl.innerHTML = `<p class="admin-empty-note" style="color:var(--red)">Hata: ${err.message}</p>`;
  }
}

async function adminVerifyFoundCode() {
  if (!_adminFoundSpin) return;
  await adminVerifyCode(_adminFoundSpin.code);
  document.getElementById('adminVerifyInput').value = '';
  document.getElementById('adminVerifyResult').innerHTML = '';
  _adminFoundSpin = null;
}

async function adminVerifyCode(code) {
  try {
    await sbVerifySpin(code);
    await loadAdminKodlar();
  } catch(err) {
    alert('Onaylama hatası: ' + err.message);
  }
}

/* ============================================================
   SPLASH / GİRİŞ EKRANI
   ============================================================ */
function initSplash() {
  const splash = document.getElementById('splashScreen');
  if (!splash) return;

  let done = false;

  function doExit() {
    if (done) return;
    done = true;

    // Hemen basın yazısını söndür
    const press = document.getElementById('splashPress');
    const divider = splash.querySelector('.splash-divider');
    if (press)   { press.style.animation = 'none'; press.style.opacity = '0'; press.style.transition = 'opacity 0.15s'; }
    if (divider) { divider.style.opacity = '0'; divider.style.transition = 'opacity 0.15s'; }

    // Kısa gecikme: logo alevlenir, sonra ekran kararır
    setTimeout(() => {
      splash.classList.add('splash-exit');
    }, 180);

    // DOM'dan kaldır
    setTimeout(() => {
      splash.style.display = 'none';
    }, 1100);

    document.removeEventListener('keydown', doExit);
    splash.removeEventListener('click', doExit);
    splash.removeEventListener('touchstart', doExit);
  }

  document.addEventListener('keydown', doExit);
  splash.addEventListener('click', doExit);
  splash.addEventListener('touchstart', doExit, { passive: true });
}

/* ============================================================
   STARTUP
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Splash ekranı başlat
  initSplash();

  // En iyi skor göster
  const best = localStorage.getItem('periodBirdBest');
  if (best) {
    const el = document.getElementById('bestScore');
    if (el) el.textContent = best;
  }
  // Oturum geri yükle
  authInit();
  // Etkinlik, galeri ve ana sayfa mini etkinlikleri yükle
  renderDynamicEvents();
  renderGallery();
  renderHomeEvents();
});

/* ============================================================
   AUTH SYSTEM — Supabase
   ============================================================ */
let _currentUser = null; // { username, is_admin }

async function authInit() {
  const session = localStorage.getItem('periodSession');
  if (!session) return;
  try {
    const cached = JSON.parse(session);
    _currentUser = cached;
    _setLoggedIn(cached.username, cached.is_admin);
    // Supabase'den güncel profil çek
    const fresh = await sbGetProfile(cached.username);
    if (!fresh) {
      // Kullanıcı adı değişmiş ya da hesap silinmiş — oturumu temizle
      localStorage.removeItem('periodSession');
      _currentUser = null;
      document.getElementById('authGuest').style.display = '';
      document.getElementById('authUser').style.display  = 'none';
      const adminBtn = document.getElementById('adminNavBtn');
      if (adminBtn) adminBtn.style.display = 'none';
      return;
    }
    if (fresh.is_admin !== cached.is_admin) {
      _currentUser.is_admin = fresh.is_admin;
      localStorage.setItem('periodSession', JSON.stringify(_currentUser));
      _setLoggedIn(_currentUser.username, _currentUser.is_admin);
    }
  } catch {
    localStorage.removeItem('periodSession');
  }
}

function openAuthModal(tab) {
  const overlay = document.getElementById('authModalOverlay');
  overlay.classList.add('open');
  document.getElementById('authTabLogin').style.display    = tab === 'login'    ? '' : 'none';
  document.getElementById('authTabRegister').style.display = tab === 'register' ? '' : 'none';
  document.getElementById('loginError').textContent    = '';
  document.getElementById('registerError').textContent = '';
}

function closeAuthModal() {
  document.getElementById('authModalOverlay').classList.remove('open');
}

async function submitLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');
  errEl.textContent = 'Giriş yapılıyor...';
  try {
    const user = await sbLogin(username, password);
    _currentUser = user;
    localStorage.setItem('periodSession', JSON.stringify(user));
    _setLoggedIn(user.username, user.is_admin);
    closeAuthModal();
  } catch (err) {
    errEl.textContent = err.message || 'Giriş başarısız.';
  }
}

async function submitRegister(e) {
  e.preventDefault();
  const username = document.getElementById('registerUsername').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirm  = document.getElementById('registerPasswordConfirm').value;
  const errEl    = document.getElementById('registerError');

  if (username.length < 3) { errEl.textContent = 'Kullanıcı adı en az 3 karakter olmalı.'; return; }
  if (password.length < 6) { errEl.textContent = 'Şifre en az 6 karakter olmalı.'; return; }
  if (password !== confirm) { errEl.textContent = 'Şifreler eşleşmiyor.'; return; }

  errEl.textContent = 'Kayıt yapılıyor...';
  try {
    const exists = await sbUsernameExists(username);
    if (exists) { errEl.textContent = 'Bu kullanıcı adı alınmış.'; return; }
    const user = await sbRegister(username, password);
    _currentUser = user;
    localStorage.setItem('periodSession', JSON.stringify(user));
    _setLoggedIn(user.username, user.is_admin);
    closeAuthModal();
  } catch (err) {
    errEl.textContent = err.message || 'Kayıt başarısız.';
  }
}

function logoutUser() {
  localStorage.removeItem('periodSession');
  _currentUser = null;
  document.getElementById('authGuest').style.display = '';
  document.getElementById('authUser').style.display  = 'none';
  const adminBtn = document.getElementById('adminNavBtn');
  if (adminBtn) adminBtn.style.display = 'none';
  const prizesNav = document.getElementById('navMyPrizes');
  if (prizesNav) prizesNav.style.display = 'none';
}

function _setLoggedIn(username, is_admin) {
  document.getElementById('authGuest').style.display  = 'none';
  document.getElementById('authUser').style.display   = '';
  document.getElementById('authUsername').textContent = username;
  const adminBtn = document.getElementById('adminNavBtn');
  if (adminBtn) adminBtn.style.display = is_admin ? '' : 'none';
  const prizesNav = document.getElementById('navMyPrizes');
  if (prizesNav) prizesNav.style.display = '';
}

/* ============================================================
   ADMIN — ETKİNLİK YÖNETİMİ — Supabase
   ============================================================ */
let adminEditingId  = null;
let adminPendingImage = null;
let _eventsCache = [];

function switchImgTab(prefix, tab) {
  const urlPanel  = document.getElementById(prefix + 'ImgTabUrl');
  const filePanel = document.getElementById(prefix + 'ImgTabFile');
  const tabs = (urlPanel || filePanel).closest('.admin-field').querySelectorAll('.img-tab');
  tabs.forEach((btn, i) => btn.classList.toggle('active', (i === 0 && tab === 'url') || (i === 1 && tab === 'file')));
  if (urlPanel)  urlPanel.style.display  = tab === 'url'  ? '' : 'none';
  if (filePanel) filePanel.style.display = tab === 'file' ? '' : 'none';
}

function adminPreviewUrl(prefix) {
  const url = document.getElementById(prefix === 'ev' ? 'evImageUrl' : 'galImageUrl').value.trim();
  const wrap = document.getElementById(prefix + 'ImgPreviewUrl');
  const img  = document.getElementById(prefix + 'ImgPreviewUrlImg');
  if (url) { img.src = url; wrap.style.display = ''; if (prefix === 'ev') adminPendingImage = null; }
  else     { wrap.style.display = 'none'; }
}

function adminPreviewImage(input) {
  if (!input.files || !input.files[0]) return;
  if (input.files[0].size > 400 * 1024) {
    alert('Dosya çok büyük (max 400 KB). Lütfen görseli Imgur\'a yükleyip link ile ekleyin.');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    adminPendingImage = e.target.result;
    document.getElementById('evImgPreview').innerHTML =
      `<img src="${adminPendingImage}" alt="Önizleme">`;
    document.getElementById('evImageUrl').value = '';
    document.getElementById('evImgPreviewUrl').style.display = 'none';
  };
  reader.readAsDataURL(input.files[0]);
}

async function adminSaveEvent() {
  const title = document.getElementById('evTitle').value.trim();
  if (!title) { alert('Lütfen etkinlik başlığı girin.'); return; }

  const btn = document.getElementById('adminSaveBtn');
  btn.textContent = 'KAYDEDİLİYOR...';
  btn.disabled = true;

  const ev = {
    id:       adminEditingId || null,
    title,
    type:     document.getElementById('evType').value.trim(),
    cover:    document.getElementById('evCover').value.trim(),
    date:     document.getElementById('evDate').value,
    time:     document.getElementById('evTime').value.trim(),
    location: document.getElementById('evLocation').value.trim(),
    desc:     document.getElementById('evDesc').value.trim(),
    content:  document.getElementById('evContent').value.trim(),
    featured: document.getElementById('evFeatured').checked,
    image:    document.getElementById('evImageUrl').value.trim() || adminPendingImage || (adminEditingId ? (_eventsCache.find(e=>e.id===adminEditingId)||{}).image_url : null),
  };

  try {
    await sbSaveEvent(ev);
    localStorage.removeItem('eventsCache');
    adminClearForm();
    await adminRenderList();
    await renderDynamicEvents();
  } catch(err) {
    alert('Kayıt hatası: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'ETKİNLİĞİ KAYDET';
  }
}

function adminClearForm() {
  ['evTitle','evType','evCover','evDate','evTime','evDesc','evContent'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('evLocation').value = 'Hawick, Los Santos';
  document.getElementById('evFeatured').checked = false;
  document.getElementById('evImgPreview').innerHTML = '<span>+ Görsel Yükle</span>';
  document.getElementById('evImageFile').value = '';
  document.getElementById('evImageUrl').value = '';
  document.getElementById('evImgPreviewUrl').style.display = 'none';
  adminPendingImage = null;
  adminEditingId = null;
  document.getElementById('adminSaveBtn').textContent = 'ETKİNLİĞİ KAYDET';
}

function adminEditEvent(id) {
  const ev = _eventsCache.find(e => e.id === id);
  if (!ev) return;
  adminEditingId = id;
  document.getElementById('evTitle').value      = ev.title    || '';
  document.getElementById('evType').value       = ev.type     || '';
  document.getElementById('evCover').value      = ev.cover    || '';
  document.getElementById('evDate').value       = ev.date     || '';
  document.getElementById('evTime').value       = ev.time     || '';
  document.getElementById('evLocation').value   = ev.location || 'Hawick, Los Santos';
  document.getElementById('evDesc').value       = ev.description || '';
  document.getElementById('evContent').value    = ev.content  || '';
  document.getElementById('evFeatured').checked = ev.featured || false;
  const urlInput = document.getElementById('evImageUrl');
  const urlWrap  = document.getElementById('evImgPreviewUrl');
  const urlImg   = document.getElementById('evImgPreviewUrlImg');
  if (ev.image_url) {
    urlInput.value = ev.image_url;
    urlImg.src = ev.image_url;
    urlWrap.style.display = '';
    adminPendingImage = null;
    switchImgTab('ev', 'url');
  } else {
    urlInput.value = '';
    urlWrap.style.display = 'none';
    adminPendingImage = null;
    document.getElementById('evImgPreview').innerHTML = '<span>+ Görsel Yükle</span>';
  }
  document.getElementById('adminSaveBtn').textContent = 'DEĞİŞİKLİKLERİ KAYDET';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function adminDeleteEvent(id) {
  if (!confirm('Bu etkinliği silmek istediğine emin misin?')) return;
  try {
    await sbDeleteEvent(id);
    localStorage.removeItem('eventsCache');
    await adminRenderList();
    await renderDynamicEvents();
  } catch(err) { alert('Silme hatası: ' + err.message); }
}

async function adminRenderList() {
  const list = document.getElementById('adminEventList');
  if (!list) return;
  _eventsCache = await sbGetEvents();
  if (!_eventsCache.length) {
    list.innerHTML = '<p class="admin-empty-note">Henüz etkinlik eklenmedi.</p>'; return;
  }
  list.innerHTML = _eventsCache.map(ev => `
    <div class="admin-ev-item">
      ${ev.image_url
        ? `<img class="admin-ev-thumb" src="${ev.image_url}" alt="">`
        : `<div class="admin-ev-thumb-placeholder">🎸</div>`}
      <div class="admin-ev-info">
        <div class="admin-ev-title">${ev.title}</div>
        <div class="admin-ev-date">${ev.date || 'Tarih belirtilmedi'} ${ev.time ? '· ' + ev.time : ''}</div>
      </div>
      <div class="admin-ev-actions">
        <button class="admin-ev-edit" onclick="adminEditEvent('${ev.id}')">DÜZENLE</button>
        <button class="admin-ev-delete" onclick="adminDeleteEvent('${ev.id}')">SİL</button>
      </div>
    </div>
  `).join('');
}

function _renderEventsGrid(events) {
  const grid = document.getElementById('dynamicEventsGrid');
  const emptyMsg = document.getElementById('eventsEmptyMsg');
  if (!grid) return;
  if (!events.length) {
    grid.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = '';
    return;
  }
  if (emptyMsg) emptyMsg.style.display = 'none';
  grid.innerHTML = events.map(ev => `
    <div class="dyn-event-card" onclick="openEventDetail('${ev.id}')">
      ${ev.featured ? '<div class="dyn-event-featured-badge">★ ÖNE ÇIKAN</div>' : ''}
      ${ev.image_url
        ? `<img class="dyn-event-poster" src="${ev.image_url}" alt="${ev.title}">`
        : `<div class="dyn-event-poster-placeholder">🎸</div>`}
      <div class="dyn-event-body">
        ${ev.type ? `<div class="dyn-event-type">${ev.type}</div>` : ''}
        <div class="dyn-event-title">${ev.title}</div>
        <div class="dyn-event-meta">
          ${ev.date ? `<span>📅 ${ev.date}${ev.time ? ' · ' + ev.time : ''}</span>` : ''}
          ${ev.location ? `<span>📍 ${ev.location}</span>` : ''}
          ${ev.cover ? `<span>🎟 ${ev.cover}</span>` : ''}
        </div>
        ${ev.description ? `<div class="dyn-event-desc">${ev.description}</div>` : ''}
      </div>
    </div>
  `).join('');
}

async function renderDynamicEvents() {
  // Önce cache'den göster
  try {
    const cached = JSON.parse(localStorage.getItem('eventsCache') || '[]');
    if (cached.length) { _eventsCache = cached; _renderEventsGrid(cached); }
  } catch {}
  // Arka planda tazesini çek ve güncelle
  const events = await sbGetEvents();
  _eventsCache = events;
  try { localStorage.setItem('eventsCache', JSON.stringify(events)); } catch {}
  _renderEventsGrid(events);
}

function openEventDetail(id) {
  const ev = _eventsCache.find(e => e.id === id);
  if (!ev) return;
  const imgWrap = document.getElementById('eventDetailImg');
  const imgEl   = document.getElementById('eventDetailImgEl');
  if (ev.image_url) { imgEl.src = ev.image_url; imgWrap.style.display = ''; }
  else imgWrap.style.display = 'none';
  document.getElementById('eventDetailMeta').textContent    = ev.type || '';
  document.getElementById('eventDetailTitle').textContent   = ev.title;
  document.getElementById('eventDetailContent').textContent = ev.content || ev.description || '';
  const info = document.getElementById('eventDetailInfo');
  info.innerHTML = [
    ev.date     ? `<span>📅 ${ev.date}${ev.time ? ' · ' + ev.time : ''}</span>` : '',
    ev.location ? `<span>📍 ${ev.location}</span>` : '',
    ev.cover    ? `<span>🎟 ${ev.cover}</span>`    : '',
  ].filter(Boolean).join('');
  document.getElementById('eventDetailOverlay').classList.add('open');
}

function closeEventDetail() {
  document.getElementById('eventDetailOverlay').classList.remove('open');
}

/* ============================================================
   ADMIN — TAB SİSTEMİ
   ============================================================ */
function adminSwitchTab(tab) {
  document.getElementById('adminTabEvents').style.display  = tab === 'events'  ? '' : 'none';
  document.getElementById('adminTabGallery').style.display = tab === 'gallery' ? '' : 'none';
  document.getElementById('adminTabUsers').style.display   = tab === 'users'   ? '' : 'none';
  document.getElementById('adminTabKodlar').style.display  = tab === 'kodlar'  ? '' : 'none';
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  if (tab === 'gallery') adminRenderGalleryList();
  if (tab === 'users') adminRenderUserList();
  if (tab === 'kodlar') loadAdminKodlar();
}

/* ============================================================
   GALERİ YÖNETİMİ — Supabase
   ============================================================ */
let galPendingImage = null;
let _galleryCache = [];

function galInitDefaults() { /* Supabase schema.sql'de yapılıyor */ }

function galPreviewUrl() {
  const url  = document.getElementById('galImageUrl').value.trim();
  const wrap = document.getElementById('galImgPreviewUrl');
  const img  = document.getElementById('galImgPreviewUrlImg');
  if (url) { img.src = url; wrap.style.display = ''; galPendingImage = null; }
  else     { wrap.style.display = 'none'; }
}

function galPreviewImage(input) {
  if (!input.files || !input.files[0]) return;
  if (input.files[0].size > 400 * 1024) {
    alert('Dosya çok büyük (max 400 KB). Lütfen görseli Imgur\'a yükleyip link ile ekleyin.');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    galPendingImage = e.target.result;
    document.getElementById('galImgPreview').innerHTML =
      `<img src="${galPendingImage}" style="width:100%;height:180px;object-fit:contain;background:#111">`;
    document.getElementById('galImageUrl').value = '';
    document.getElementById('galImgPreviewUrl').style.display = 'none';
  };
  reader.readAsDataURL(input.files[0]);
}

async function galSavePhoto() {
  const urlInput = document.getElementById('galImageUrl').value.trim();
  const src = urlInput || galPendingImage;
  if (!src) { alert('Lütfen bir görsel URL\'si girin veya dosya seçin.'); return; }
  const caption = document.getElementById('galCaption').value.trim();
  const large   = document.getElementById('galLarge').checked;
  try {
    await sbAddPhoto({ src, caption, large });
    galPendingImage = null;
    document.getElementById('galImgPreview').innerHTML = '<span>+ Fotoğraf Yükle</span>';
    document.getElementById('galImageUrl').value = '';
    document.getElementById('galImgPreviewUrl').style.display = 'none';
    document.getElementById('galCaption').value = '';
    document.getElementById('galLarge').checked = false;
    document.getElementById('galImageFile').value = '';
    await adminRenderGalleryList();
    await renderGallery();
  } catch(err) { alert('Yükleme hatası: ' + err.message); }
}

async function galDeletePhoto(id) {
  if (!confirm('Bu fotoğrafı galeriden kaldırmak istediğine emin misin?')) return;
  try {
    await sbDeletePhoto(id);
    await adminRenderGalleryList();
    await renderGallery();
  } catch(err) { alert('Silme hatası: ' + err.message); }
}

async function galToggleLarge(id) {
  const p = _galleryCache.find(p => p.id === id);
  if (!p) return;
  try {
    await sbTogglePhotoLarge(id, !p.large);
    await adminRenderGalleryList();
    await renderGallery();
  } catch(err) { alert('Hata: ' + err.message); }
}

async function adminRenderGalleryList() {
  const list = document.getElementById('adminGalleryList');
  if (!list) return;
  _galleryCache = await sbGetGallery();
  if (!_galleryCache.length) { list.innerHTML = '<p class="admin-empty-note">Henüz fotoğraf yok.</p>'; return; }
  list.innerHTML = _galleryCache.map(p => `
    <div class="admin-gal-item">
      <img src="${p.image_url}" alt="${p.caption || ''}">
      <div class="admin-gal-caption">${p.caption || '—'}</div>
      <div class="admin-gal-actions">
        <button class="admin-gal-toggle ${p.large ? 'wide' : ''}" onclick="galToggleLarge('${p.id}')">${p.large ? 'GENİŞ ✓' : 'GENİŞ'}</button>
        <button class="admin-gal-del" onclick="galDeletePhoto('${p.id}')">SİL</button>
      </div>
    </div>
  `).join('');
}

/* ============================================================
   KULLANICI YÖNETİMİ — Admin Panel
   ============================================================ */
async function adminRenderUserList() {
  const list = document.getElementById('adminUserList');
  if (!list) return;
  list.innerHTML = '<p class="admin-empty-note">Yükleniyor...</p>';
  try {
    const users = await sbGetUsers();
    if (!users.length) { list.innerHTML = '<p class="admin-empty-note">Henüz kayıtlı kullanıcı yok.</p>'; return; }
    list.innerHTML = users.map(u => `
      <div class="admin-user-item ${u.is_admin ? 'is-admin' : ''}">
        <div class="admin-user-info">
          <span class="admin-user-name">${u.username}</span>
          <span class="admin-user-badge ${u.is_admin ? 'badge-admin' : 'badge-user'}">${u.is_admin ? 'ADMİN' : 'KULLANICI'}</span>
        </div>
        <div class="admin-user-actions">
          ${u.username !== 'AstorSoren'
            ? u.is_admin
              ? `<button class="admin-user-demote" onclick="adminToggleUserAdmin('${u.username}', true)">YETKİYİ AL</button>`
              : `<button class="admin-user-promote" onclick="adminToggleUserAdmin('${u.username}', false)">ADMİN YAP</button>`
            : '<span class="admin-user-owner">OWNER</span>'
          }
        </div>
      </div>
    `).join('');
  } catch(err) {
    list.innerHTML = `<p class="admin-empty-note">Hata: ${err.message}</p>`;
  }
}

async function adminToggleUserAdmin(username, currentIsAdmin) {
  const action = currentIsAdmin ? 'YETKİYİ AL' : 'ADMİN YAP';
  if (!confirm(`"${username}" kullanıcısını ${action} yapmak istediğine emin misin?`)) return;
  try {
    await sbSetAdmin(username, !currentIsAdmin);
    // Aktif oturum bu kullanıcıya aitse session'ı da güncelle
    if (_currentUser && _currentUser.username === username) {
      _currentUser.is_admin = !currentIsAdmin;
      localStorage.setItem('periodSession', JSON.stringify(_currentUser));
      _setLoggedIn(_currentUser.username, _currentUser.is_admin);
    }
    await adminRenderUserList();
  } catch(err) { alert('Hata: ' + err.message); }
}

/* ============================================================
   ANA SAYFA — MİNİ ETKİNLİK KARTI
   ============================================================ */
function _renderHomeEventsMini(events) {
  const wrap = document.getElementById('homeEventsMini');
  if (!wrap) return;
  if (!events.length) {
    wrap.innerHTML = '<p style="font-size:0.75rem;color:var(--text-faint);letter-spacing:0.08em">Henüz etkinlik eklenmedi.</p>';
    return;
  }
  wrap.innerHTML = events.slice(0, 3).map(ev => `
    <div class="home-ev-mini-card" onclick="navigateTo('events')">
      <div class="home-ev-mini-img" style="background-image:url('${ev.image_url || ''}')">
        ${!ev.image_url ? '<span class="home-ev-mini-placeholder">🎸</span>' : ''}
      </div>
      <div class="home-ev-mini-info">
        ${ev.type ? `<span class="home-ev-mini-type">${ev.type}</span>` : ''}
        <span class="home-ev-mini-title">${ev.title}</span>
        ${ev.date ? `<span class="home-ev-mini-date">📅 ${ev.date}${ev.time ? ' · ' + ev.time : ''}</span>` : ''}
      </div>
    </div>
  `).join('');
}

async function renderHomeEvents() {
  // Önce cache'den göster
  try {
    const cached = JSON.parse(localStorage.getItem('eventsCache') || '[]');
    if (cached.length) _renderHomeEventsMini(cached);
  } catch {}
  // Arka planda güncelle (renderDynamicEvents zaten çekiyor, cache paylaşılıyor)
  const events = await sbGetEvents();
  try { localStorage.setItem('eventsCache', JSON.stringify(events)); } catch {}
  _renderHomeEventsMini(events);
}

async function renderGallery() {
  const grid = document.getElementById('dynamicGalleryGrid');
  if (!grid) return;
  const photos = await sbGetGallery();
  _galleryCache = photos;
  grid.innerHTML = photos.map(p => `
    <div class="gallery-item ${p.large ? 'gi-large' : ''}"
         style="background-image:url('${p.image_url}')"
         onclick="openLightbox('${p.image_url}')">
      <div class="gi-overlay"><span>${p.caption ? p.caption : '+ Büyüt'}</span></div>
    </div>
  `).join('');
}

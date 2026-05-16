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
  }
  if (pageId === 'wheel') {
    requestAnimationFrame(() => initWheel());
  }
  if (pageId === 'admin') {
    adminRenderList();
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

    this._updateLeaderboard();
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

  _updateLeaderboard() {
    // Update local best in leaderboard if it beats placeholder 4th entry
    if (this.score > 0) {
      const lb = document.getElementById('leaderboardList');
      if (!lb) return;
      const items = lb.querySelectorAll('.lb-item');
      const lastItem = items[items.length - 1];
      if (lastItem) {
        const lastScore = parseInt(lastItem.querySelector('.lb-score')?.textContent.replace(',', '') || '0');
        if (this.score > lastScore) {
          lastItem.querySelector('.lb-name').textContent = 'TU';
          lastItem.querySelector('.lb-score').textContent = this.score.toLocaleString();
        }
      }
    }
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

function viewFullLeaderboard() {
  alert('Skor tablosu yakında aktif edilecek!\nŞu anki en iyi puan: ' + (birdGame ? birdGame.bestScore : localStorage.getItem('periodBirdBest') || 0));
}

/* ============================================================
   PERIOD ÇARK — SPIN WHEEL
   ============================================================ */

class PeriodWheel {
  constructor() {
    this.canvas = document.getElementById('wheelCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.prizes = [
      { label: 'Ücretsiz İçki', color: '#4a0000', borderColor: '#cc2222', textColor: '#ffaaaa' },
      { label: '%50 İndirim',   color: '#2a1800', borderColor: '#cc8800', textColor: '#ffcc66' },
      { label: 'Mystery Shot',  color: '#1a0535', borderColor: '#8833cc', textColor: '#cc88ff' },
      { label: 'Adri Special',  color: '#3d0000', borderColor: '#ff0000', textColor: '#ffdddd' },
      { label: 'Tekrar Dene',   color: '#0a1a0a', borderColor: '#228822', textColor: '#aaffaa' },
      { label: 'JACKPOT!',      color: '#1a1400', borderColor: '#ccaa00', textColor: '#ffd700' },
    ];

    this.numPrizes = this.prizes.length;
    this.sliceAngle = (2 * Math.PI) / this.numPrizes;

    this.currentAngle = -Math.PI / 2; // Start with first prize at top
    this.spinning = false;
    this.highlightIndex = -1;

    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const outerR = Math.min(cx, cy) - 8;
    const innerR = 28;

    ctx.clearRect(0, 0, W, H);

    // Outer glow ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, outerR + 4, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(204,0,0,0.3)';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.restore();

    // Draw slices
    for (let i = 0; i < this.numPrizes; i++) {
      const prize = this.prizes[i];
      const startA = this.currentAngle + i * this.sliceAngle;
      const endA = startA + this.sliceAngle;
      const midA = startA + this.sliceAngle / 2;

      // Slice fill
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, startA, endA);
      ctx.closePath();

      // Highlight winning slice
      if (i === this.highlightIndex) {
        ctx.fillStyle = prize.borderColor;
        ctx.shadowBlur = 30;
        ctx.shadowColor = prize.borderColor;
      } else {
        ctx.fillStyle = prize.color;
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;

      // Slice border
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, startA, endA);
      ctx.closePath();
      ctx.strokeStyle = prize.borderColor;
      ctx.lineWidth = i === this.highlightIndex ? 2.5 : 1.5;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(midA);

      // Text shadow
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';

      // Prize label
      const textR = outerR * 0.62;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = prize.textColor;
      ctx.font = prize.label.length > 8 ? 'bold 12px Oswald, sans-serif' : 'bold 13px Oswald, sans-serif';

      // Multi-line for long text
      const words = prize.label.split(' ');
      if (words.length > 1 && prize.label.length > 8) {
        const mid = Math.ceil(words.length / 2);
        const line1 = words.slice(0, mid).join(' ');
        const line2 = words.slice(mid).join(' ');
        ctx.fillText(line1, textR, -7);
        ctx.fillText(line2, textR, 7);
      } else {
        ctx.fillText(prize.label, textR, 0);
      }

      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Outer border ring
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(204,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner hub
    const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR);
    hubGrad.addColorStop(0, '#2a0000');
    hubGrad.addColorStop(1, '#0a0505');
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.strokeStyle = '#cc0000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Hub skull icon
    ctx.fillStyle = 'rgba(204,0,0,0.8)';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('☠', cx, cy);
  }

  spin() {
    if (this.spinning) return;
    this.spinning = true;
    this.highlightIndex = -1;

    const spinBtn = document.getElementById('spinBtn');
    const resultBox = document.getElementById('wheelResultBox');
    if (spinBtn) spinBtn.disabled = true;
    if (resultBox) resultBox.style.display = 'none';

    // Randomize total rotation: 5–10 full spins + random stop angle
    const minSpins = 5;
    const extraSpins = minSpins + Math.random() * 5;
    const stopAngle = Math.random() * 2 * Math.PI;
    const totalAngle = extraSpins * 2 * Math.PI + stopAngle;

    const duration = 3500 + Math.random() * 1500;
    const startTime = performance.now();
    const startAngle = this.currentAngle;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out quintic
      const eased = 1 - Math.pow(1 - progress, 5);

      this.currentAngle = startAngle + totalAngle * eased;
      this.draw();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.spinning = false;
        this.currentAngle = startAngle + totalAngle;
        this._onSpinEnd(spinBtn, resultBox);
      }
    };

    requestAnimationFrame(animate);
  }

  _onSpinEnd(spinBtn, resultBox) {
    // The pointer is at the top (12 o'clock = -PI/2).
    // Wheel segments start at currentAngle going clockwise.
    // Normalize angle to find which slice is at pointer (top).
    const pointerAngle = -Math.PI / 2;
    let relAngle = ((pointerAngle - this.currentAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const winnerIndex = Math.floor(relAngle / this.sliceAngle) % this.numPrizes;
    const winner = this.prizes[winnerIndex];

    this.highlightIndex = winnerIndex;
    this.draw();

    if (resultBox) {
      resultBox.style.display = 'block';
      const resultText = document.getElementById('wheelResultText');
      if (resultText) resultText.textContent = winner.label;
    }

    if (spinBtn) {
      setTimeout(() => {
        spinBtn.disabled = false;
      }, 3000);
    }

    // Highlight prize row in list
    document.querySelectorAll('.prize-row').forEach((row, i) => {
      row.style.borderLeftColor = i === winnerIndex ? winner.borderColor : '';
      row.style.background = i === winnerIndex ? 'rgba(204,0,0,0.15)' : '';
    });
  }
}

function initWheel() {
  if (!wheelGame) {
    wheelGame = new PeriodWheel();
  } else {
    wheelGame.draw();
  }
}

function spinWheel() {
  if (!wheelGame) wheelGame = new PeriodWheel();
  wheelGame.spin();
}

/* ============================================================
   STARTUP
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Load best score display
  const best = localStorage.getItem('periodBirdBest');
  if (best) {
    const el = document.getElementById('bestScore');
    if (el) el.textContent = best;
  }
  // Restore auth session
  authInit();
  // Render any saved events & gallery from Supabase
  renderDynamicEvents();
  renderGallery();
});

/* ============================================================
   AUTH SYSTEM — Supabase
   ============================================================ */
let _currentUser = null; // { username, is_admin }

function authInit() {
  const session = localStorage.getItem('periodSession');
  if (session) {
    try { _currentUser = JSON.parse(session); _setLoggedIn(_currentUser.username, _currentUser.is_admin); }
    catch { localStorage.removeItem('periodSession'); }
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
}

function _setLoggedIn(username, is_admin) {
  document.getElementById('authGuest').style.display  = 'none';
  document.getElementById('authUser').style.display   = '';
  document.getElementById('authUsername').textContent = username;
  const adminBtn = document.getElementById('adminNavBtn');
  if (adminBtn) adminBtn.style.display = is_admin ? '' : 'none';
}

/* ============================================================
   ADMIN — ETKİNLİK YÖNETİMİ — Supabase
   ============================================================ */
let adminEditingId  = null;
let adminPendingImage = null;
let _eventsCache = [];

function adminPreviewImage(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    adminPendingImage = e.target.result;
    document.getElementById('evImgPreview').innerHTML =
      `<img src="${adminPendingImage}" alt="Önizleme">`;
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
    image:    adminPendingImage || (adminEditingId ? (_eventsCache.find(e=>e.id===adminEditingId)||{}).image_url : null),
  };

  try {
    await sbSaveEvent(ev);
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
  const preview = document.getElementById('evImgPreview');
  if (ev.image_url) {
    adminPendingImage = ev.image_url;
    preview.innerHTML = `<img src="${ev.image_url}" alt="Önizleme">`;
  } else {
    adminPendingImage = null;
    preview.innerHTML = '<span>+ Görsel Yükle</span>';
  }
  document.getElementById('adminSaveBtn').textContent = 'DEĞİŞİKLİKLERİ KAYDET';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function adminDeleteEvent(id) {
  if (!confirm('Bu etkinliği silmek istediğine emin misin?')) return;
  try {
    await sbDeleteEvent(id);
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

async function renderDynamicEvents() {
  const grid = document.getElementById('dynamicEventsGrid');
  if (!grid) return;
  const events = await sbGetEvents();
  _eventsCache = events;
  const emptyMsg = document.getElementById('eventsEmptyMsg');
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
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  if (tab === 'gallery') adminRenderGalleryList();
}

/* ============================================================
   GALERİ YÖNETİMİ — Supabase
   ============================================================ */
let galPendingImage = null;
let _galleryCache = [];

function galInitDefaults() { /* Supabase schema.sql'de yapılıyor */ }

function galPreviewImage(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    galPendingImage = e.target.result;
    document.getElementById('galImgPreview').innerHTML =
      `<img src="${galPendingImage}" style="width:100%;height:180px;object-fit:contain;background:#111">`;
  };
  reader.readAsDataURL(input.files[0]);
}

async function galSavePhoto() {
  if (!galPendingImage) { alert('Lütfen bir fotoğraf seçin.'); return; }
  const caption = document.getElementById('galCaption').value.trim();
  const large   = document.getElementById('galLarge').checked;
  try {
    await sbAddPhoto({ src: galPendingImage, caption, large });
    galPendingImage = null;
    document.getElementById('galImgPreview').innerHTML = '<span>+ Fotoğraf Yükle</span>';
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

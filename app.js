/**
 * CyberFinger & CyberPong — 2-Player AI Hand Tracking & Physics Game
 * Features:
 * - Simultaneous 2-Hand Tracking with MediaPipe Hands (P1 vs P2)
 * - Dynamic Hand Swatting Physics with momentum transfer & Super Smash
 * - Left and Right Goals with collision posts, net detection, and celebration FX
 * - AI Bot Opponent toggle for single-player practice
 * - Screen Shake, Particle Explosions, Procedural Web Audio FX
 * - Multi-mode Engine: 2P Cyber Pong, Physics Orbs, Air Canvas, Stardust Trail, Synth Theremin
 */

(() => {
  'use strict';

  // ==========================================
  // CONFIGURATION & GLOBAL GAME STATE
  // ==========================================
  const state = {
    mode: 'pong', // 'pong' | 'physics' | 'draw' | 'trail' | 'audio'
    cameraActive: false,
    mediaPipeLoaded: false,
    isMirror: true,
    showSkeleton: true,
    showFeed: true,
    feedOpacity: 0.75,
    soundEnabled: true,
    botEnabled: false,

    // Air canvas options
    brushColor: '#00f5d4',
    brushSize: 6,

    // Player 1 (Left Goal defender, Cyan)
    p1: {
      x: 180,
      y: 350,
      prevX: 180,
      prevY: 350,
      vx: 0,
      vy: 0,
      speed: 0,
      active: false,
      isPinching: false,
      landmarks: null,
      score: 0,
      name: 'PLAYER 1',
      color: '#00f5d4',
    },

    // Player 2 (Right Goal defender, Pink)
    p2: {
      x: 700,
      y: 350,
      prevX: 700,
      prevY: 350,
      vx: 0,
      vy: 0,
      speed: 0,
      active: false,
      isPinching: false,
      landmarks: null,
      score: 0,
      name: 'PLAYER 2',
      color: '#ff007f',
    },

    // Hand tracking stats
    handsDetected: 0,
    fps: 0,
    frameCount: 0,
    lastFpsUpdate: performance.now(),
    screenShake: 0,
  };

  // DOM Elements
  const webcam = document.getElementById('webcam');
  const canvas = document.getElementById('renderCanvas');
  const ctx = canvas.getContext('2d');

  // Offscreen Air Canvas
  const drawCanvas = document.createElement('canvas');
  const drawCtx = drawCanvas.getContext('2d');

  // UI Elements
  const toggleCameraBtn = document.getElementById('toggleCameraBtn');
  const cameraBtnText = document.getElementById('cameraBtnText');
  const fpsCounter = document.getElementById('fpsCounter');
  const helpBtn = document.getElementById('helpBtn');
  const helpModal = document.getElementById('helpModal');
  const closeHelpBtn = document.getElementById('closeHelpBtn');
  const modalGotItBtn = document.getElementById('modalGotItBtn');
  const modeButtons = document.querySelectorAll('.mode-btn');
  const airCanvasToolbar = document.getElementById('airCanvasToolbar');
  const touchNoticeBanner = document.getElementById('touchNoticeBanner');
  const hintText = document.getElementById('hintText');

  // Scoreboard Elements
  const pongScoreboard = document.getElementById('pongScoreboard');
  const scoreP1El = document.getElementById('scoreP1');
  const scoreP2El = document.getElementById('scoreP2');
  const p2TitleText = document.getElementById('p2TitleText');
  const matchStatusBadge = document.getElementById('matchStatusBadge');
  const toggleBotBtn = document.getElementById('toggleBotBtn');
  const resetScoreBtn = document.getElementById('resetScoreBtn');
  const gameAnnouncement = document.getElementById('gameAnnouncement');
  const announcementTitle = document.getElementById('announcementTitle');
  const announcementSub = document.getElementById('announcementSub');

  // HUD Elements
  const telemetryHud = document.getElementById('telemetryHud');
  const trackingStatusBadge = document.getElementById('trackingStatusBadge');
  const hudHandsCount = document.getElementById('hudHandsCount');
  const hudP1Speed = document.getElementById('hudP1Speed');
  const hudP2Speed = document.getElementById('hudP2Speed');
  const hudBallSpeed = document.getElementById('hudBallSpeed');
  const hudSmashStatus = document.getElementById('hudSmashStatus');

  // Settings Elements
  const skeletonToggle = document.getElementById('skeletonToggle');
  const cameraFeedToggle = document.getElementById('cameraFeedToggle');
  const mirrorToggle = document.getElementById('mirrorToggle');
  const soundToggle = document.getElementById('soundToggle');
  const feedOpacitySlider = document.getElementById('feedOpacitySlider');
  const brushSizeSlider = document.getElementById('brushSize');
  const brushSizeVal = document.getElementById('brushSizeVal');
  const clearCanvasBtn = document.getElementById('clearCanvasBtn');
  const saveCanvasBtn = document.getElementById('saveCanvasBtn');
  const colorSwatches = document.querySelectorAll('.color-swatch');

  // ==========================================
  // PROCEDURAL WEB AUDIO ENGINE
  // ==========================================
  class GameAudioEngine {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (!this.ctx) {
        const AudioClass = window.AudioContext || window.webkitAudioContext;
        if (AudioClass) this.ctx = new AudioClass();
      } else if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    // Swat hit sound
    playSwat(isSmash = false) {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (isSmash) {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320 + Math.random() * 120, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);
      }

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + (isSmash ? 0.25 : 0.1));
    }

    // Wall bounce tick
    playWallBounce() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    }

    // Goal fanfare
    playGoal() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const notes = [330, 440, 554, 660, 880];
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.22, this.ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + i * 0.08);
        osc.stop(this.ctx.currentTime + i * 0.08 + 0.4);
      });
    }

    // Victory fanfare
    playWin() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const chord = [261.63, 329.63, 392.00, 523.25, 659.25];
      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 1.3);
      });
    }

    // Pop sound (for bubble orbs)
    playPop() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    }
  }

  const audio = new GameAudioEngine();

  // ==========================================
  // PARTICLE SYSTEM (Sparks, Trails, Confetti)
  // ==========================================
  class ParticleSystem {
    constructor() {
      this.particles = [];
      this.trails = [];
    }

    emit(x, y, count = 10, color = '#00f5d4', speed = 5, isSpark = true) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = (0.5 + Math.random() * 0.9) * speed;
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          life: 1.0,
          decay: 0.015 + Math.random() * 0.025,
          size: 2 + Math.random() * 5,
          color,
          isSpark,
        });
      }
    }

    emitConfetti(x, y, count = 40) {
      const colors = ['#00f5d4', '#ff007f', '#ffe600', '#00b4d8', '#ffffff'];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 9;
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
          decay: 0.01 + Math.random() * 0.015,
          size: 4 + Math.random() * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          isSpark: false,
        });
      }
    }

    update() {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life -= p.decay;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }

    render(ctx) {
      ctx.save();
      for (const p of this.particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.isSpark ? 10 : 4;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    clear() {
      this.particles = [];
      this.trails = [];
    }
  }

  const particles = new ParticleSystem();

  // ==========================================
  // PONG BALL & PHYSICS ENGINE
  // ==========================================
  class PongBall {
    constructor() {
      this.x = 0;
      this.y = 0;
      this.radius = 22;
      this.vx = 0;
      this.vy = 0;
      this.speed = 0;
      this.trail = [];
      this.maxTrail = 16;
      this.isSmash = false;
      this.lastHitPlayer = null;
      this.state = 'SERVE_COUNTDOWN'; // 'SERVE_COUNTDOWN' | 'ACTIVE' | 'GOAL_SCORED'
      this.serveTimer = 0;
      this.serveDirection = 1; // 1 = to Right (P2), -1 = to Left (P1)
    }

    reset(width, height, serveTowards = 1) {
      this.x = width / 2;
      this.y = height / 2;
      this.vx = 0;
      this.vy = 0;
      this.speed = 0;
      this.trail = [];
      this.isSmash = false;
      this.lastHitPlayer = null;
      this.state = 'SERVE_COUNTDOWN';
      this.serveTimer = 60; // ~1 second countdown
      this.serveDirection = serveTowards;
    }

    serve() {
      const angle = (Math.random() - 0.5) * 0.7; // slight vertical angle
      const initialSpeed = 8;
      this.vx = Math.cos(angle) * initialSpeed * this.serveDirection;
      this.vy = Math.sin(angle) * initialSpeed;
      this.speed = Math.hypot(this.vx, this.vy);
      this.state = 'ACTIVE';
      audio.playSwat(false);
    }

    update(width, height) {
      // Handle Serve Countdown
      if (this.state === 'SERVE_COUNTDOWN') {
        this.serveTimer--;
        if (this.serveTimer <= 0) {
          this.serve();
        }
        return;
      }

      if (this.state !== 'ACTIVE') return;

      // Update Trail
      this.trail.unshift({ x: this.x, y: this.y, isSmash: this.isSmash });
      if (this.trail.length > this.maxTrail) this.trail.pop();

      // Apply Velocity
      this.x += this.vx;
      this.y += this.vy;
      this.speed = Math.hypot(this.vx, this.vy);

      // Slight Air Friction (keeps game fast & controllable)
      this.vx *= 0.998;
      this.vy *= 0.998;

      // Top & Bottom Boundary Wall Collisions
      if (this.y - this.radius < 0) {
        this.y = this.radius;
        this.vy = Math.abs(this.vy);
        audio.playWallBounce();
        particles.emit(this.x, this.y, 6, '#ffffff', 3);
      } else if (this.y + this.radius > height) {
        this.y = height - this.radius;
        this.vy = -Math.abs(this.vy);
        audio.playWallBounce();
        particles.emit(this.x, this.y, 6, '#ffffff', 3);
      }

      // Goal Bounds
      const goalTop = height * 0.22;
      const goalBottom = height * 0.78;
      const inGoalMouth = this.y >= goalTop && this.y <= goalBottom;

      // Left Wall / Left Goal
      if (this.x - this.radius <= 0) {
        if (inGoalMouth) {
          // Player 2 Scores!
          this.onGoalScored('PLAYER 2', 2, width, height);
          return;
        } else {
          // Bounce off post/wall
          this.x = this.radius;
          this.vx = Math.abs(this.vx) * 1.05;
          audio.playWallBounce();
          particles.emit(this.x, this.y, 8, state.p1.color, 4);
        }
      }

      // Right Wall / Right Goal
      if (this.x + this.radius >= width) {
        if (inGoalMouth) {
          // Player 1 Scores!
          this.onGoalScored('PLAYER 1', 1, width, height);
          return;
        } else {
          // Bounce off post/wall
          this.x = width - this.radius;
          this.vx = -Math.abs(this.vx) * 1.05;
          audio.playWallBounce();
          particles.emit(this.x, this.y, 8, state.p2.color, 4);
        }
      }

      // Reset smash effect when ball decelerates
      if (this.isSmash && this.speed < 15) {
        this.isSmash = false;
      }
    }

    onGoalScored(scorerName, playerNum, width, height) {
      this.state = 'GOAL_SCORED';
      state.screenShake = 22;

      if (playerNum === 1) {
        state.p1.score++;
        scoreP1El.textContent = state.p1.score;
      } else {
        state.p2.score++;
        scoreP2El.textContent = state.p2.score;
      }

      audio.playGoal();
      particles.emitConfetti(playerNum === 1 ? width - 50 : 50, this.y, 60);

      // Check Match Point
      const WIN_SCORE = 5;
      if (state.p1.score >= WIN_SCORE || state.p2.score >= WIN_SCORE) {
        const winner = state.p1.score >= WIN_SCORE ? state.p1.name : state.p2.name;
        showAnnouncement(`🏆 ${winner} WINS!`, 'MATCH POINT REACHED!');
        audio.playWin();
        matchStatusBadge.textContent = 'GAME OVER';
        return;
      }

      showAnnouncement('GOAL!', `${scorerName} SCORED!`);

      // Serve towards the player who conceded
      setTimeout(() => {
        hideAnnouncement();
        this.reset(width, height, playerNum === 1 ? -1 : 1);
      }, 1800);
    }

    // Swat collision check with a player's hand
    checkHandSwat(player, isPlayer1) {
      if (this.state !== 'ACTIVE') return;

      const handX = player.x;
      const handY = player.y;
      const swatRadius = 55; // aura radius around fingertip / palm

      const dx = this.x - handX;
      const dy = this.y - handY;
      const dist = Math.hypot(dx, dy);

      if (dist < this.radius + swatRadius) {
        // Prevent sticking: push ball outside swat circle
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        this.x = handX + nx * (this.radius + swatRadius + 2);

        // Player swing velocity
        const handSpeed = player.speed;
        const isSmash = handSpeed > 360; // fast swat triggers smash!

        // Base rebound
        let newVx = (isPlayer1 ? 1 : -1) * Math.max(9, Math.abs(this.vx) * 1.08);
        let newVy = this.vy + player.vy * 0.4 + (ny * 3);

        // Momentum transfer from hand swing
        newVx += player.vx * 0.7;
        newVy += player.vy * 0.5;

        // Apply Super Smash speed boost
        if (isSmash) {
          const smashSpeed = Math.min(27, Math.max(18, handSpeed * 0.04));
          newVx = (isPlayer1 ? 1 : -1) * smashSpeed;
          this.isSmash = true;
          state.screenShake = 14;
          hudSmashStatus.textContent = 'SMASH!! 🔥';
          hudSmashStatus.className = 'metric-val gesture-badge pink-text';
          setTimeout(() => {
            hudSmashStatus.textContent = 'READY';
            hudSmashStatus.className = 'metric-val gesture-badge';
          }, 1200);
        } else {
          this.isSmash = false;
        }

        // Clamp ball speed
        const currentSpeed = Math.hypot(newVx, newVy);
        const maxSpeed = 26;
        if (currentSpeed > maxSpeed) {
          newVx = (newVx / currentSpeed) * maxSpeed;
          newVy = (newVy / currentSpeed) * maxSpeed;
        }

        this.vx = newVx;
        this.vy = newVy;
        this.lastHitPlayer = player;

        // Audio & Visual Effects
        audio.playSwat(isSmash);
        particles.emit(this.x, this.y, isSmash ? 24 : 12, player.color, isSmash ? 8 : 4);
      }
    }

    render(ctx) {
      if (this.state === 'GOAL_SCORED') return;

      ctx.save();

      // Draw Trail
      for (let i = 0; i < this.trail.length; i++) {
        const pt = this.trail[i];
        const progress = 1 - (i / this.trail.length);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, this.radius * progress * 0.85, 0, Math.PI * 2);
        ctx.fillStyle = pt.isSmash ? '#ffe600' : (this.lastHitPlayer ? this.lastHitPlayer.color : '#00f5d4');
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = pt.isSmash ? 22 : 12;
        ctx.globalAlpha = progress * 0.45;
        ctx.fill();
      }

      // Ball Core
      ctx.globalAlpha = 1.0;
      const ballColor = this.isSmash ? '#ffe600' : (this.lastHitPlayer ? this.lastHitPlayer.color : '#ffffff');
      ctx.shadowColor = ballColor;
      ctx.shadowBlur = this.isSmash ? 30 : 18;

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = ballColor;
      ctx.fill();

      // Glass / Energy Highlight
      ctx.beginPath();
      ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fill();

      // Serve Countdown Ring
      if (this.state === 'SERVE_COUNTDOWN') {
        const pulse = (this.serveTimer / 60) * Math.PI * 2;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 14, 0, pulse);
        ctx.stroke();

        ctx.font = '700 13px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('SERVE', this.x, this.y - 32);
      }

      ctx.restore();
    }
  }

  const pongBall = new PongBall();

  // Announcements overlay helper
  function showAnnouncement(title, sub) {
    announcementTitle.textContent = title;
    announcementSub.textContent = sub;
    gameAnnouncement.style.display = 'block';
  }

  function hideAnnouncement() {
    gameAnnouncement.style.display = 'none';
  }

  // ==========================================
  // PHYSICS ORBS (Mode 2)
  // ==========================================
  class OrbSimulation {
    constructor() {
      this.orbs = [];
      this.colors = ['#00f5d4', '#ff007f', '#ffe600', '#00b4d8', '#9d4edd'];
    }

    init(width, height, count = 22) {
      this.orbs = [];
      for (let i = 0; i < count; i++) {
        this.spawnOrb(width, height);
      }
    }

    spawnOrb(width, height) {
      const radius = 18 + Math.random() * 24;
      this.orbs.push({
        x: radius + Math.random() * (width - radius * 2),
        y: radius + Math.random() * (height - radius * 2),
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    update(players, width, height) {
      for (let i = this.orbs.length - 1; i >= 0; i--) {
        const orb = this.orbs[i];
        orb.pulsePhase += 0.04;

        if (orb.x - orb.radius < 0) { orb.x = orb.radius; orb.vx *= -1; }
        if (orb.x + orb.radius > width) { orb.x = width - orb.radius; orb.vx *= -1; }
        if (orb.y - orb.radius < 0) { orb.y = orb.radius; orb.vy *= -1; }
        if (orb.y + orb.radius > height) { orb.y = height - orb.radius; orb.vy *= -1; }

        orb.x += orb.vx;
        orb.y += orb.vy;
        orb.vx *= 0.99;
        orb.vy *= 0.99;

        // Check interaction with all active hands
        for (const p of players) {
          if (!p.active) continue;
          const dx = orb.x - p.x;
          const dy = orb.y - p.y;
          const dist = Math.hypot(dx, dy);

          if (p.isPinching && dist < orb.radius + 18) {
            particles.emit(orb.x, orb.y, 25, orb.color);
            audio.playPop();
            this.orbs.splice(i, 1);
            setTimeout(() => this.spawnOrb(width, height), 1200);
            break;
          }

          if (dist < 180 && dist > 1) {
            const force = (180 - dist) / 180;
            orb.vx += (dx / dist) * force * 1.4;
            orb.vy += (dy / dist) * force * 1.4;
          }
        }
      }
    }

    render(ctx) {
      ctx.save();
      for (const orb of this.orbs) {
        const pulse = Math.sin(orb.pulsePhase) * 2;
        const currentR = Math.max(5, orb.radius + pulse);

        ctx.save();
        ctx.shadowColor = orb.color;
        ctx.shadowBlur = 18;
        ctx.fillStyle = orb.color;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, currentR, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = orb.color;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, currentR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(orb.x - currentR * 0.3, orb.y - currentR * 0.3, currentR * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
  }

  const orbSim = new OrbSimulation();

  // ==========================================
  // RESIZE & CANVAS MANAGEMENT
  // ==========================================
  function resizeCanvases() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const prevData = drawCanvas.width > 0 ? drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height) : null;
    drawCanvas.width = w;
    drawCanvas.height = h;
    if (prevData) drawCtx.putImageData(prevData, 0, 0);

    pongBall.reset(w, h, 1);
    orbSim.init(w, h, 22);
  }

  window.addEventListener('resize', resizeCanvases);

  // ==========================================
  // 2-HAND MEDIAPIPE TRACKING INTEGRATION
  // ==========================================
  let handsModel = null;
  let cameraStream = null;

  async function initMediaPipe() {
    if (typeof Hands === 'undefined') return false;

    try {
      handsModel = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      // Track up to 2 hands simultaneously!
      handsModel.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      handsModel.onResults(onHandResults);
      state.mediaPipeLoaded = true;
      return true;
    } catch (err) {
      console.error('Failed to initialize MediaPipe Hands:', err);
      return false;
    }
  }

  function onHandResults(results) {
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      state.handsDetected = 0;
      state.p1.active = false;
      state.p2.active = false;
      return;
    }

    state.handsDetected = results.multiHandLandmarks.length;

    // Process all detected hands
    const detectedHands = results.multiHandLandmarks.map((lm) => {
      // Index fingertip is landmark 8
      const tip = lm[8];
      const screenX = state.isMirror ? (1 - tip.x) * w : tip.x * w;
      const screenY = tip.y * h;

      // Pinch check (Thumb tip #4 to Index tip #8)
      const thumb = lm[4];
      const pinchDist = Math.hypot(tip.x - thumb.x, tip.y - thumb.y);

      return {
        x: screenX,
        y: screenY,
        landmarks: lm,
        isPinching: pinchDist < 0.08,
      };
    });

    // Assign Player 1 & Player 2 spatially:
    // Leftmost hand is Player 1 (defending Left Goal), Rightmost hand is Player 2 (defending Right Goal)
    if (detectedHands.length === 1) {
      const hand = detectedHands[0];
      if (hand.x < w * 0.5) {
        assignPlayer(state.p1, hand);
        state.p2.active = false;
      } else {
        assignPlayer(state.p2, hand);
        state.p1.active = false;
      }
    } else {
      // 2 hands: sort by X
      detectedHands.sort((a, b) => a.x - b.x);
      assignPlayer(state.p1, detectedHands[0]);
      assignPlayer(state.p2, detectedHands[1]);
    }
  }

  function assignPlayer(player, handData) {
    const factor = 0.45;
    player.x += (handData.x - player.x) * factor;
    player.y += (handData.y - player.y) * factor;
    player.landmarks = handData.landmarks;
    player.isPinching = handData.isPinching;
    player.active = true;
  }

  // Camera Toggle
  async function toggleCamera() {
    audio.init();

    if (state.cameraActive) {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
      }
      state.cameraActive = false;
      webcam.srcObject = null;
      toggleCameraBtn.classList.remove('active');
      cameraBtnText.textContent = 'Enable Camera';
      touchNoticeBanner.style.display = 'block';
      hintText.textContent = 'Touch or drag on screen to play, or enable camera for 2-hand AI tracking!';
      return;
    }

    try {
      if (!state.mediaPipeLoaded) {
        await initMediaPipe();
      }

      hintText.textContent = 'Starting camera & AI vision models...';
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
      webcam.srcObject = cameraStream;
      await webcam.play();

      state.cameraActive = true;
      toggleCameraBtn.classList.add('active');
      cameraBtnText.textContent = 'Disable Camera';
      touchNoticeBanner.style.display = 'none';
      hintText.textContent = '2-Hand Tracking Active! Player 1 on left, Player 2 on right. Swat the ball!';

      startCameraProcessing();
    } catch (err) {
      console.error('Camera access error:', err);
      alert(`Could not start camera: ${err.message || 'Permission denied'}.\nYou can still play by touching or moving your mouse!`);
      state.cameraActive = false;
    }
  }

  let isSendingFrame = false;
  function startCameraProcessing() {
    const processFrame = async () => {
      if (!state.cameraActive) return;
      if (!isSendingFrame && webcam.readyState >= 2 && handsModel) {
        isSendingFrame = true;
        try {
          await handsModel.send({ image: webcam });
        } catch (e) {
          console.warn('Frame processing note:', e);
        } finally {
          isSendingFrame = false;
        }
      }
      requestAnimationFrame(processFrame);
    };
    requestAnimationFrame(processFrame);
  }

  // ==========================================
  // POINTER & TOUCH FALLBACK
  // ==========================================
  function setupPointerEvents() {
    const handlePointer = (e) => {
      const w = window.innerWidth;
      if (e.clientX < w * 0.5) {
        state.p1.x = e.clientX;
        state.p1.y = e.clientY;
        state.p1.active = true;
      } else {
        state.p2.x = e.clientX;
        state.p2.y = e.clientY;
        state.p2.active = true;
      }
    };

    window.addEventListener('pointerdown', (e) => {
      audio.init();
      handlePointer(e);
    });

    window.addEventListener('pointermove', handlePointer);
  }

  // ==========================================
  // AI BOT OPPONENT (Single Player mode)
  // ==========================================
  function updateAIBot(w, h) {
    if (!state.botEnabled || state.p2.active) return;

    // AI Bot controls Player 2 on the right side
    const targetX = w * 0.82;
    // Follow the ball's Y with slight delay & predictive lead
    const targetY = Math.max(h * 0.15, Math.min(h * 0.85, pongBall.y + pongBall.vy * 4));

    const ease = 0.085;
    state.p2.x += (targetX - state.p2.x) * ease;
    state.p2.y += (targetY - state.p2.y) * ease;
    state.p2.active = true;
  }

  // ==========================================
  // UPDATE VELOCITIES & TELEMETRY
  // ==========================================
  function updateTelemetry(now) {
    const dt = 16.67; // standard frame step

    // Calculate P1 Velocity
    const dx1 = state.p1.x - state.p1.prevX;
    const dy1 = state.p1.y - state.p1.prevY;
    state.p1.vx = dx1;
    state.p1.vy = dy1;
    state.p1.speed = Math.round((Math.hypot(dx1, dy1) / dt) * 1000);
    state.p1.prevX = state.p1.x;
    state.p1.prevY = state.p1.y;

    // Calculate P2 Velocity
    const dx2 = state.p2.x - state.p2.prevX;
    const dy2 = state.p2.y - state.p2.prevY;
    state.p2.vx = dx2;
    state.p2.vy = dy2;
    state.p2.speed = Math.round((Math.hypot(dx2, dy2) / dt) * 1000);
    state.p2.prevX = state.p2.x;
    state.p2.prevY = state.p2.y;

    // FPS calculation
    state.frameCount++;
    if (now - state.lastFpsUpdate >= 500) {
      state.fps = Math.round((state.frameCount * 1000) / (now - state.lastFpsUpdate));
      fpsCounter.textContent = `${state.fps} FPS`;
      state.frameCount = 0;
      state.lastFpsUpdate = now;
    }

    // Update Telemetry Panel
    hudHandsCount.textContent = `${state.handsDetected} / 2`;
    hudP1Speed.textContent = `${state.p1.speed} px/s`;
    hudP2Speed.textContent = `${state.p2.speed} px/s`;
    hudBallSpeed.textContent = `${Math.round(pongBall.speed * 60)} px/s`;

    trackingStatusBadge.textContent = state.cameraActive ? (state.handsDetected > 0 ? 'AI LOCKED' : 'SEARCHING') : 'TOUCH/POINTER';
    trackingStatusBadge.className = `hud-chip ${state.handsDetected > 0 || !state.cameraActive ? 'active' : ''}`;
  }

  // ==========================================
  // DRAWING PITCH & GOALS
  // ==========================================
  function renderPitch(ctx, w, h) {
    ctx.save();

    // Midfield Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center Circle
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 100, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Goal Boxes
    const goalTop = h * 0.22;
    const goalHeight = h * 0.56;

    // Left Goal (Player 1 Territory, Cyan)
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.6)';
    ctx.shadowColor = '#00f5d4';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 3;
    ctx.strokeRect(0, goalTop, 40, goalHeight);

    ctx.fillStyle = 'rgba(0, 245, 212, 0.08)';
    ctx.fillRect(0, goalTop, 40, goalHeight);

    // Right Goal (Player 2 Territory, Pink)
    ctx.strokeStyle = 'rgba(255, 0, 127, 0.6)';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 3;
    ctx.strokeRect(w - 40, goalTop, 40, goalHeight);

    ctx.fillStyle = 'rgba(255, 0, 127, 0.08)';
    ctx.fillRect(w - 40, goalTop, 40, goalHeight);

    ctx.restore();
  }

  // ==========================================
  // RENDER PLAYER HANDS & SHIELDS
  // ==========================================
  function renderPlayerHand(ctx, player, isPlayer1) {
    if (!player.active) return;

    ctx.save();
    const auraColor = player.color;
    const isSmashReady = player.speed > 360;

    // Glowing Swatting Reticle
    ctx.shadowColor = auraColor;
    ctx.shadowBlur = isSmashReady ? 25 : 14;
    ctx.strokeStyle = isSmashReady ? '#ffe600' : auraColor;
    ctx.lineWidth = isSmashReady ? 3.5 : 2.5;

    // Outer Swat Ring
    ctx.beginPath();
    ctx.arc(player.x, player.y, 48, 0, Math.PI * 2);
    ctx.stroke();

    // Center Core
    ctx.fillStyle = auraColor;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 48, 0, Math.PI * 2);
    ctx.fill();

    // Player Label
    ctx.globalAlpha = 1.0;
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillStyle = auraColor;
    ctx.textAlign = 'center';
    ctx.fillText(`${player.name}`, player.x, player.y - 60);

    if (isSmashReady) {
      ctx.fillStyle = '#ffe600';
      ctx.fillText('⚡ SMASH READY', player.x, player.y - 75);
    }

    // Hand Skeleton if MediaPipe landmarks exist
    if (state.showSkeleton && player.landmarks) {
      renderSkeletonLines(ctx, player.landmarks, auraColor);
    }

    ctx.restore();
  }

  function renderSkeletonLines(ctx, lm, color) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const toScreen = (pt) => ({
      x: state.isMirror ? (1 - pt.x) * w : pt.x * w,
      y: pt.y * h,
    });

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17]
    ];

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.globalAlpha = 0.6;

    for (const [i, j] of connections) {
      const p1 = toScreen(lm[i]);
      const p2 = toScreen(lm[j]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Render webcam feed with mirror support
  function renderVideoFeed(ctx) {
    if (!state.cameraActive || !state.showFeed || webcam.readyState < 2) return;

    ctx.save();
    ctx.globalAlpha = state.feedOpacity;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const vw = webcam.videoWidth;
    const vh = webcam.videoHeight;
    const videoRatio = vw / vh;
    const screenRatio = w / h;
    let dw, dh, dx, dy;

    if (screenRatio > videoRatio) {
      dw = w;
      dh = w / videoRatio;
      dx = 0;
      dy = (h - dh) / 2;
    } else {
      dh = h;
      dw = h * videoRatio;
      dx = (w - dw) / 2;
      dy = 0;
    }

    if (state.isMirror) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(webcam, dx, dy, dw, dh);
    } else {
      ctx.drawImage(webcam, dx, dy, dw, dh);
    }
    ctx.restore();
  }

  // ==========================================
  // MAIN ANIMATION & GAME LOOP
  // ==========================================
  function animate(now) {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Apply Screen Shake
    ctx.save();
    if (state.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * state.screenShake;
      const shakeY = (Math.random() - 0.5) * state.screenShake;
      ctx.translate(shakeX, shakeY);
      state.screenShake *= 0.88;
      if (state.screenShake < 0.5) state.screenShake = 0;
    }

    // 1. Clear Screen
    ctx.clearRect(0, 0, w, h);

    // 2. Camera feed
    renderVideoFeed(ctx);

    // 3. AI Bot & Telemetry
    updateAIBot(w, h);
    updateTelemetry(now);

    // 4. Mode-specific rendering
    if (state.mode === 'pong') {
      renderPitch(ctx, w, h);

      // Pong Ball Physics & Swatting
      pongBall.update(w, h);
      if (state.p1.active) pongBall.checkHandSwat(state.p1, true);
      if (state.p2.active) pongBall.checkHandSwat(state.p2, false);
      pongBall.render(ctx);

      // Render Player Hand Shields
      renderPlayerHand(ctx, state.p1, true);
      renderPlayerHand(ctx, state.p2, false);

      particles.update();
      particles.render(ctx);

    } else if (state.mode === 'physics') {
      orbSim.update([state.p1, state.p2], w, h);
      orbSim.render(ctx);
      renderPlayerHand(ctx, state.p1, true);
      renderPlayerHand(ctx, state.p2, false);
      particles.update();
      particles.render(ctx);

    } else if (state.mode === 'draw') {
      // Air Canvas
      if (state.p1.active && state.p1.isPinching) {
        drawCtx.save();
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        drawCtx.lineWidth = state.brushSize;
        drawCtx.strokeStyle = state.brushColor;
        drawCtx.shadowColor = state.brushColor;
        drawCtx.shadowBlur = 12;

        drawCtx.beginPath();
        drawCtx.arc(state.p1.x, state.p1.y, state.brushSize / 2, 0, Math.PI * 2);
        drawCtx.fill();
        drawCtx.restore();

        particles.emit(state.p1.x, state.p1.y, 2, state.brushColor);
      }
      ctx.drawImage(drawCanvas, 0, 0);
      renderPlayerHand(ctx, state.p1, true);
      renderPlayerHand(ctx, state.p2, false);
      particles.update();
      particles.render(ctx);

    } else if (state.mode === 'trail') {
      if (state.p1.active) {
        particles.emit(state.p1.x, state.p1.y, state.p1.speed > 150 ? 4 : 2, state.p1.color);
      }
      if (state.p2.active) {
        particles.emit(state.p2.x, state.p2.y, state.p2.speed > 150 ? 4 : 2, state.p2.color);
      }
      renderPlayerHand(ctx, state.p1, true);
      renderPlayerHand(ctx, state.p2, false);
      particles.update();
      particles.render(ctx);

    } else if (state.mode === 'audio') {
      renderPlayerHand(ctx, state.p1, true);
      renderPlayerHand(ctx, state.p2, false);
      particles.update();
      particles.render(ctx);
    }

    ctx.restore();
    requestAnimationFrame(animate);
  }

  // ==========================================
  // EVENT LISTENERS & SETUP
  // ==========================================
  function setupEventListeners() {
    toggleCameraBtn.addEventListener('click', toggleCamera);

    // Bot Opponent Toggle
    toggleBotBtn.addEventListener('click', () => {
      state.botEnabled = !state.botEnabled;
      toggleBotBtn.textContent = state.botEnabled ? '🤖 Bot: ON' : '🤖 Bot: OFF';
      toggleBotBtn.className = `pill-btn mini ${state.botEnabled ? 'primary' : 'secondary'}`;
      p2TitleText.textContent = state.botEnabled ? 'AI BOT' : 'PLAYER 2';
      state.p2.name = state.botEnabled ? 'AI BOT' : 'PLAYER 2';
    });

    // Score Reset
    resetScoreBtn.addEventListener('click', () => {
      state.p1.score = 0;
      state.p2.score = 0;
      scoreP1El.textContent = '0';
      scoreP2El.textContent = '0';
      matchStatusBadge.textContent = 'FIRST TO 5';
      hideAnnouncement();
      pongBall.reset(window.innerWidth, window.innerHeight, 1);
    });

    // Mode Switcher Tabs
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        audio.init();
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.mode = btn.dataset.mode;

        // Toggle Scoreboard & Toolbars
        pongScoreboard.style.display = state.mode === 'pong' ? 'flex' : 'none';
        airCanvasToolbar.style.display = state.mode === 'draw' ? 'flex' : 'none';

        if (state.mode === 'pong') {
          hintText.textContent = 'P1 (Left hand) vs P2 (Right hand): Swat the ball into the opposing goal! Fast swings trigger SUPER SMASH!';
        } else if (state.mode === 'physics') {
          hintText.textContent = 'Physics Mode: Flick and bat the bubbles, or pinch them to pop!';
        } else if (state.mode === 'draw') {
          hintText.textContent = 'Air Canvas: Pinch index and thumb to paint glowing neon art!';
        } else if (state.mode === 'trail') {
          hintText.textContent = 'Stardust Trail: Move your hands to unleash particle fireworks!';
        }
      });
    });

    // Modal
    helpBtn.addEventListener('click', () => helpModal.showModal());
    closeHelpBtn.addEventListener('click', () => helpModal.close());
    modalGotItBtn.addEventListener('click', () => helpModal.close());
    helpModal.addEventListener('click', (e) => {
      const rect = helpModal.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
        helpModal.close();
      }
    });

    // Toggles
    skeletonToggle.addEventListener('change', (e) => state.showSkeleton = e.target.checked);
    cameraFeedToggle.addEventListener('change', (e) => state.showFeed = e.target.checked);
    mirrorToggle.addEventListener('change', (e) => state.isMirror = e.target.checked);
    soundToggle.addEventListener('change', (e) => state.soundEnabled = e.target.checked);
    feedOpacitySlider.addEventListener('input', (e) => state.feedOpacity = parseFloat(e.target.value));

    // Air canvas swatches
    colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        colorSwatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        state.brushColor = swatch.dataset.color;
      });
    });

    brushSizeSlider.addEventListener('input', (e) => {
      state.brushSize = parseInt(e.target.value, 10);
      brushSizeVal.textContent = `${state.brushSize}px`;
    });

    clearCanvasBtn.addEventListener('click', () => {
      drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
      particles.clear();
      audio.playPop();
    });

    saveCanvasBtn.addEventListener('click', () => {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;
      const expCtx = exportCanvas.getContext('2d');
      expCtx.fillStyle = '#0a0c14';
      expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      expCtx.drawImage(drawCanvas, 0, 0, exportCanvas.width, exportCanvas.height);

      const link = document.createElement('a');
      link.download = `cyber-finger-art-${Date.now()}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
    });
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================
  function init() {
    resizeCanvases();
    setupPointerEvents();
    setupEventListeners();

    // Start Animation Loop
    requestAnimationFrame(animate);

    // Pre-initialize MediaPipe Hands model
    initMediaPipe();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

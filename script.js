/**
 * GlitchGrip - Futuristic Japanese-inspired AI Hand-Tracking Visual Playground
 * Powered by p5.js and MediaPipe Hands
 */

(function () {
  'use strict';

  // --- Japanese Cyberpunk Kanji & Symbol Pool ---
  const KANJI_GLYPHS = ['零', '破', '斬', '撃', '閃', '歪', '滅', '醒', '虚', '極', '電', '裂', '桜', '渦'];
  const CYBER_DEC = ['01', '0x7F', 'NEO-TOKYO', 'G-GRIP', 'SYS//OK', 'RAD:99', 'SYNC'];

  // --- Configuration & Global State ---
  const state = {
    hands: [],
    previousHands: [],
    twoHandsDist: 0,
    prevTwoHandsDist: 0,
    handDistDelta: 0,
    activeGesture: 'NONE',
    activeGestureDetail: '',
    cameraActive: false,
    cameraInitialized: false,
    isMirror: true,
    audioEnabled: true,
    glitchIntensity: 65,
    particleDensity: 80,
    mouseInteraction: {
      x: 0,
      y: 0,
      isDown: false,
      mode: 'free' // 'sakura', 'pinch', 'shockwave', 'laser', 'rift', 'collapse', 'free'
    },
    screenShake: 0,
    glitchFlashTimer: 0,
    screenFlash: 0
  };

  // --- Audio Engine (Web Audio API Synthesizer) ---
  class CyberAudioEngine {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      this.lastPinchTime = 0;
      this.lastLaserTime = 0;
      this.lastRiftTime = 0;
    }

    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playSakuraChime() {
      if (this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // Pentatonic / Japanese in-scale
      const freq = notes[Math.floor(Math.random() * notes.length)];

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.35);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.52);
    }

    playPinchHum(intensity = 0.5) {
      if (this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      if (now - this.lastPinchTime < 0.08) return;
      this.lastPinchTime = now;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const baseFreq = 120 + intensity * 400;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.linearRampToValueAtTime(baseFreq + 60, now + 0.07);

      gain.gain.setValueAtTime(0.06 * intensity, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    }

    playShockwaveBoom() {
      if (this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;

      // Sub bass oscillator
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.6);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);

      // Noise burst
      try {
        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(800, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.2);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.2, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(now);
        noise.stop(now + 0.22);
      } catch (e) {
        // Fallback safely if buffer creation fails
      }
    }

    playLaserZap() {
      if (this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      if (now - this.lastLaserTime < 0.09) return;
      this.lastLaserTime = now;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200 + Math.random() * 400, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.08);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    }

    playRiftElectric() {
      if (this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      if (now - this.lastRiftTime < 0.12) return;
      this.lastRiftTime = now;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220 + Math.random() * 200, now);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
    }

    playSupernovaBoom() {
      if (this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(18, now + 1.2);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 1.35);
    }
  }

  const audio = new CyberAudioEngine();

  // --- Visual Entities & Particle Systems ---

  // 1. Sakura Petal Particle
  class SakuraPetal {
    constructor(x, y, vx, vy) {
      this.x = x;
      this.y = y;
      this.vx = vx || (Math.random() - 0.5) * 6;
      this.vy = vy || (Math.random() - 0.5) * 6 - 2;
      this.size = 10 + Math.random() * 16;
      this.angle = Math.random() * Math.PI * 2;
      this.angularVelocity = (Math.random() - 0.5) * 0.12;
      this.alpha = 255;
      this.decay = 1.2 + Math.random() * 2.2;
      this.hue = Math.random() > 0.3 ? 340 : 320; // Soft pink & cyber magenta
      this.swaySpeed = 0.03 + Math.random() * 0.04;
      this.swayPhase = Math.random() * 100;
      this.isAlive = true;
    }

    update(gravity = 0.08) {
      this.swayPhase += this.swaySpeed;
      this.vx += Math.sin(this.swayPhase) * 0.15;
      this.vy += gravity;
      this.vx *= 0.98;
      this.vy *= 0.98;

      this.x += this.vx;
      this.y += this.vy;
      this.angle += this.angularVelocity;
      this.alpha -= this.decay;

      if (this.alpha <= 0) {
        this.isAlive = false;
      }
    }

    draw(p) {
      p.push();
      p.translate(this.x, this.y);
      p.rotate(this.angle);

      // Cyber glow bloom
      p.noStroke();
      p.fill(345, 80, 100, (this.alpha / 255) * 0.4);
      p.ellipse(0, 0, this.size * 1.8, this.size * 2.4);

      // Petal shape (5-curve parametric or stylized Japanese petal)
      p.fill(this.hue, 70, 95, this.alpha / 255);
      p.beginShape();
      p.vertex(0, -this.size);
      p.bezierVertex(this.size * 0.7, -this.size * 0.5, this.size * 0.8, this.size * 0.5, 0, this.size);
      p.bezierVertex(-this.size * 0.8, this.size * 0.5, -this.size * 0.7, -this.size * 0.5, 0, -this.size);
      p.endShape(p.CLOSE);

      // Petal notch
      p.fill(350, 40, 100, this.alpha / 255);
      p.triangle(0, -this.size * 0.9, -this.size * 0.2, -this.size * 1.05, this.size * 0.2, -this.size * 1.05);

      p.pop();
    }
  }

  // 2. Cyber Shockwave Entity
  class ShockwaveRing {
    constructor(x, y, maxRadius = 380) {
      this.x = x;
      this.y = y;
      this.radius = 10;
      this.maxRadius = maxRadius;
      this.speed = 14;
      this.alpha = 255;
      this.kanjiList = [];
      this.isAlive = true;

      // Generate 6 to 10 orbiting Japanese kanji symbols
      const count = 8;
      for (let i = 0; i < count; i++) {
        this.kanjiList.push({
          char: KANJI_GLYPHS[Math.floor(Math.random() * KANJI_GLYPHS.length)],
          angle: (i / count) * Math.PI * 2,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.08
        });
      }
    }

    update() {
      this.radius += this.speed;
      this.speed *= 0.97;
      this.alpha = (1 - this.radius / this.maxRadius) * 255;

      for (let k of this.kanjiList) {
        k.rot += k.rotSpeed;
      }

      if (this.radius >= this.maxRadius || this.alpha <= 5) {
        this.isAlive = false;
      }
    }

    draw(p) {
      const normAlpha = Math.max(0, this.alpha / 255);

      p.push();
      p.noFill();

      // Outer primary shockwave ring
      p.stroke(185, 100, 100, normAlpha); // Neon cyan
      p.strokeWeight(3.5);
      p.ellipse(this.x, this.y, this.radius * 2);

      // Inner chromatic displacement ring
      p.stroke(330, 100, 100, normAlpha * 0.8); // Magenta
      p.strokeWeight(2);
      p.ellipse(this.x, this.y, (this.radius - 8) * 2);

      // Secondary geometric ring (dashed polygon or hexagon)
      p.stroke(50, 100, 100, normAlpha * 0.6); // Yellow accent
      p.strokeWeight(1.5);
      p.beginShape();
      const sides = 8;
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2 + this.radius * 0.01;
        const px = this.x + Math.cos(a) * (this.radius * 0.9);
        const py = this.y + Math.sin(a) * (this.radius * 0.9);
        p.vertex(px, py);
      }
      p.endShape(p.CLOSE);

      // Render orbiting Japanese Kanji symbols along the shockwave perimeter
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(16 + (this.radius / this.maxRadius) * 12);
      for (let k of this.kanjiList) {
        const kx = this.x + Math.cos(k.angle) * this.radius;
        const ky = this.y + Math.sin(k.angle) * this.radius;
        p.push();
        p.translate(kx, ky);
        p.rotate(k.rot);
        p.fill(185, 100, 100, normAlpha);
        p.text(k.char, 0, 0);
        p.pop();
      }

      p.pop();
    }
  }

  // 3. Laser Ribbon & Spark Particles
  class LaserSpark {
    constructor(x, y, vx, vy) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.life = 1.0;
      this.decay = 0.03 + Math.random() * 0.05;
      this.size = 2 + Math.random() * 4;
      this.hue = Math.random() > 0.4 ? 185 : 55;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.94;
      this.vy *= 0.94;
      this.life -= this.decay;
    }

    draw(p) {
      if (this.life <= 0) return;
      p.push();
      p.noStroke();
      p.fill(this.hue, 100, 100, this.life);
      p.ellipse(this.x, this.y, this.size * this.life);
      p.pop();
    }
  }

  // 4. Glitch Fragment Block (for Pinch & Shockwave)
  class GlitchFragment {
    constructor(x, y) {
      this.x = x + (Math.random() - 0.5) * 80;
      this.y = y + (Math.random() - 0.5) * 80;
      this.w = 12 + Math.random() * 45;
      this.h = 4 + Math.random() * 12;
      this.vx = (Math.random() - 0.5) * 12;
      this.vy = (Math.random() - 0.5) * 12;
      this.life = 1.0;
      this.decay = 0.04 + Math.random() * 0.05;
      this.colorType = Math.floor(Math.random() * 3); // cyan, magenta, white
      this.char = Math.random() > 0.6 ? KANJI_GLYPHS[Math.floor(Math.random() * KANJI_GLYPHS.length)] : null;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life -= this.decay;
    }

    draw(p) {
      if (this.life <= 0) return;
      p.push();
      if (this.colorType === 0) p.fill(185, 100, 100, this.life * 0.8);
      else if (this.colorType === 1) p.fill(330, 100, 100, this.life * 0.8);
      else p.fill(0, 0, 100, this.life * 0.9);

      p.noStroke();
      p.rect(this.x, this.y, this.w, this.h);

      if (this.char && this.life > 0.3) {
        p.fill(0, 0, 0, this.life);
        p.textSize(10);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(this.char, this.x + this.w / 2, this.y + this.h / 2);
      }
      p.pop();
    }
  }

  // 5. Singularity Particle for Gravity Collapse
  class CollapseParticle {
    constructor(x, y, targetX, targetY) {
      this.x = x;
      this.y = y;
      this.targetX = targetX;
      this.targetY = targetY;
      this.vx = 0;
      this.vy = 0;
      this.angle = Math.random() * Math.PI * 2;
      this.distance = Math.hypot(x - targetX, y - targetY) || 100;
      this.angularSpeed = 0.08 + Math.random() * 0.12;
      this.size = 2 + Math.random() * 4;
      this.isAlive = true;
      this.life = 1.0;
    }

    update(centerX, centerY) {
      this.targetX = centerX;
      this.targetY = centerY;
      this.distance *= 0.94; // Pull inward
      this.angle += this.angularSpeed;

      this.x = this.targetX + Math.cos(this.angle) * this.distance;
      this.y = this.targetY + Math.sin(this.angle) * this.distance;

      if (this.distance < 8) {
        this.isAlive = false;
      }
    }

    draw(p) {
      p.push();
      p.noStroke();
      p.fill(270 + Math.sin(this.angle) * 60, 100, 100, 0.85);
      p.ellipse(this.x, this.y, this.size, this.size);
      p.pop();
    }
  }

  // --- Main P5.js Instance Sketch ---
  new p5((p) => {
    // Particle containers
    const particles = {
      sakura: [],
      shockwaves: [],
      laserPoints: [],
      laserSparks: [],
      glitches: [],
      collapse: []
    };

    let prevLaserPos = null;
    let riftElectricTicks = 0;
    let lastFPSUpdate = 0;

    p.setup = () => {
      const container = document.getElementById('canvas-wrapper');
      const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
      canvas.parent('canvas-wrapper');

      p.colorMode(p.HSB, 360, 100, 100, 1.0);
      p.frameRate(60);
      p.textFont('Orbitron');

      // Initialize UI bindings & DOM Events
      initDomEvents();
    };

    p.windowResized = () => {
      const container = document.getElementById('canvas-wrapper');
      p.resizeCanvas(container.clientWidth, container.clientHeight);
    };

    p.draw = () => {
      // Background with cyber trails (slight opacity clear for motion glow)
      p.blendMode(p.BLEND);
      p.background(240, 45, 6, 0.28);

      // Handle screen shake
      if (state.screenShake > 0) {
        p.translate((p.random() - 0.5) * state.screenShake, (p.random() - 0.5) * state.screenShake);
        state.screenShake *= 0.9;
        if (state.screenShake < 0.5) state.screenShake = 0;
      }

      // 1. Draw Cyberpunk Background Grid & Radar rings
      drawCyberBackground(p);

      // 2. Process Hand Detections & Execute Active Gestures
      processHandsAndGestures(p);

      // 3. Process Mouse / Simulator Interactions (if user clicks or uses simulator)
      processSimulatorInteraction(p);

      // 4. Update and Render All Generative Particle Systems
      updateAndDrawParticles(p);

      // 5. Draw Hand Tracking Skeleton & Futuristic Hologram Landmarks
      drawHandOverlays(p);

      // 6. Draw Full-screen Glitch & Chromatic Aberration effects
      drawGlitchPostProcessing(p);

      // 7. Update Telemetry HUD every 10 frames
      if (p.frameCount % 8 === 0) {
        updateTelemetryDOM(p);
      }
    };

    // --- Cyber Background Generator ---
    function drawCyberBackground(p) {
      p.push();
      p.stroke(190, 80, 50, 0.08);
      p.strokeWeight(1);

      // Perspective horizon grid lines
      const step = 80;
      for (let x = 0; x < p.width; x += step) {
        p.line(x, 0, x, p.height);
      }
      for (let y = 0; y < p.height; y += step) {
        p.line(0, y, p.width, y);
      }

      // Subtle ambient cyber telemetry text
      p.noStroke();
      p.fill(185, 100, 80, 0.18);
      p.textSize(9);
      p.text('GLITCHGRIP // SYSTEM ONLINE // VER 2.4.9', 30, p.height - 110);
      p.text('LAT: 35.6762° N // LON: 139.6503° E [TOKYO NODE]', 30, p.height - 95);
      p.pop();
    }

    // --- Process Detected Hands from MediaPipe ---
    function processHandsAndGestures(p) {
      if (!state.hands || state.hands.length === 0) {
        return;
      }

      let detectedGestureThisFrame = 'NONE';
      let detectedKanji = '待機中';
      let detectedDesc = 'No gesture detected';

      // Multi-Hand Gestures (When 2 hands are detected)
      if (state.hands.length >= 2) {
        const handA = state.hands[0];
        const handB = state.hands[1];

        // Midpoints of palms (landmark 9 or 0)
        const posA = getLandmarkScreenPos(p, handA.landmarks[9]);
        const posB = getLandmarkScreenPos(p, handB.landmarks[9]);

        const currentDist = p.dist(posA.x, posA.y, posB.x, posB.y);
        state.handDistDelta = currentDist - (state.twoHandsDist || currentDist);
        state.twoHandsDist = currentDist;

        const screenSpan = p.width;

        // Gesture 4: Two Hands Moving Apart -> "Neon Rift"
        if (currentDist > screenSpan * 0.38 || state.handDistDelta > 6) {
          detectedGestureThisFrame = 'NEON RIFT';
          detectedKanji = 'ネオン断層';
          detectedDesc = 'Tearing spatial rift between palms // High energy discharge';
          triggerNeonRift(p, posA, posB, currentDist);
        }
        // Gesture 5: Two Hands Moving Together -> "Gravity Collapse"
        else if (currentDist < screenSpan * 0.28 || state.handDistDelta < -6) {
          detectedGestureThisFrame = 'GRAVITY COLLAPSE';
          detectedKanji = '重力崩壊';
          detectedDesc = 'Event horizon singularity // Convergence in progress';
          triggerGravityCollapse(p, posA, posB, currentDist);
        }
      }

      // Single Hand Gestures (evaluated per hand)
      for (let i = 0; i < state.hands.length; i++) {
        const hand = state.hands[i];
        const lm = hand.landmarks;
        const wrist = getLandmarkScreenPos(p, lm[0]);
        const palmCenter = getLandmarkScreenPos(p, lm[9]);

        // Landmark references
        const thumbTip = getLandmarkScreenPos(p, lm[4]);
        const indexTip = getLandmarkScreenPos(p, lm[8]);
        const middleTip = getLandmarkScreenPos(p, lm[12]);
        const ringTip = getLandmarkScreenPos(p, lm[16]);
        const pinkyTip = getLandmarkScreenPos(p, lm[20]);

        const indexPIP = getLandmarkScreenPos(p, lm[6]);
        const middlePIP = getLandmarkScreenPos(p, lm[10]);
        const ringPIP = getLandmarkScreenPos(p, lm[14]);
        const pinkyPIP = getLandmarkScreenPos(p, lm[18]);

        // Hand metrics
        const palmSize = p.dist(wrist.x, wrist.y, palmCenter.x, palmCenter.y) || 100;
        const pinchDistance = p.dist(thumbTip.x, thumbTip.y, indexTip.x, indexTip.y);
        const normalizedPinch = pinchDistance / palmSize;

        // Extension checks
        const indexExtended = p.dist(wrist.x, wrist.y, indexTip.x, indexTip.y) > p.dist(wrist.x, wrist.y, indexPIP.x, indexPIP.y) * 1.25;
        const middleExtended = p.dist(wrist.x, wrist.y, middleTip.x, middleTip.y) > p.dist(wrist.x, wrist.y, middlePIP.x, middlePIP.y) * 1.25;
        const ringExtended = p.dist(wrist.x, wrist.y, ringTip.x, ringTip.y) > p.dist(wrist.x, wrist.y, ringPIP.x, ringPIP.y) * 1.25;
        const pinkyExtended = p.dist(wrist.x, wrist.y, pinkyTip.x, pinkyTip.y) > p.dist(wrist.x, wrist.y, pinkyPIP.x, pinkyPIP.y) * 1.25;

        const extendedCount = (indexExtended ? 1 : 0) + (middleExtended ? 1 : 0) + (ringExtended ? 1 : 0) + (pinkyExtended ? 1 : 0);

        // Gesture 2: Pinch -> "Glitch Grip"
        if (normalizedPinch < 0.28) {
          detectedGestureThisFrame = 'GLITCH GRIP';
          detectedKanji = '重力把持';
          detectedDesc = 'Gravitational distortion vortex active at pinch point';
          const pinchPoint = {
            x: (thumbTip.x + indexTip.x) / 2,
            y: (thumbTip.y + indexTip.y) / 2
          };
          triggerGlitchGrip(p, pinchPoint, 1 - Math.min(1, normalizedPinch / 0.28));
        }
        // Gesture 3: Fist -> "Cyber Shockwave"
        else if (extendedCount === 0) {
          detectedGestureThisFrame = 'CYBER SHOCKWAVE';
          detectedKanji = '電脳衝撃波';
          detectedDesc = 'Fist charged // Chromatic compression and shockwave pulse';
          triggerFistShockwave(p, palmCenter);
        }
        // Gesture 6: Pointing Finger -> "Laser Trail"
        else if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
          detectedGestureThisFrame = 'LASER TRAIL';
          detectedKanji = '閃光切断';
          detectedDesc = 'High-frequency photon beam cutting through digital space';
          triggerLaserTrail(p, indexTip);
        }
        // Gesture 1: Open Palm -> "Sakura Burst"
        else if (extendedCount >= 4) {
          detectedGestureThisFrame = 'SAKURA BURST';
          detectedKanji = '桜花繚乱';
          detectedDesc = 'Gentle synthetic petal storm dispersing into void';
          triggerSakuraBurst(p, palmCenter);
        }
      }

      // Update gesture banner UI state
      if (detectedGestureThisFrame !== 'NONE') {
        updateGestureBanner(detectedGestureThisFrame, detectedKanji, detectedDesc);
      }
    }

    // --- Gesture 1: Sakura Burst ---
    function triggerSakuraBurst(p, origin) {
      audio.playSakuraChime();
      const count = Math.floor(p.map(state.particleDensity, 10, 150, 2, 7));

      for (let i = 0; i < count; i++) {
        const angle = p.random(p.TWO_PI);
        const speed = p.random(3, 11);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - p.random(2, 4);
        particles.sakura.push(new SakuraPetal(origin.x, origin.y, vx, vy));
      }

      // Cap particles for peak performance
      if (particles.sakura.length > 500) {
        particles.sakura.splice(0, particles.sakura.length - 500);
      }
    }

    // --- Gesture 2: Glitch Grip (Pinch) ---
    function triggerGlitchGrip(p, pinchPoint, strength) {
      audio.playPinchHum(strength);
      state.screenShake = Math.max(state.screenShake, strength * 4);

      // Gravitational warp on existing sakura and collapse particles
      const pullRadius = 320 * strength + 80;
      for (let pt of particles.sakura) {
        const d = p.dist(pt.x, pt.y, pinchPoint.x, pinchPoint.y);
        if (d < pullRadius && d > 10) {
          const force = (1 - d / pullRadius) * 8 * strength;
          pt.vx += ((pinchPoint.x - pt.x) / d) * force;
          pt.vy += ((pinchPoint.y - pt.y) / d) * force;
          // Color shift to cyber magenta when pulled
          pt.hue = 320;
        }
      }

      // Spawn glitch fragments and magnetic arcing
      if (p.random() < 0.6) {
        particles.glitches.push(new GlitchFragment(pinchPoint.x, pinchPoint.y));
      }

      // Draw digital distortion ring at pinch center
      p.push();
      p.noFill();
      p.stroke(320, 100, 100, 0.8 * strength);
      p.strokeWeight(2);
      const ringSize = (p.frameCount * 4) % (pullRadius * 0.8);
      p.ellipse(pinchPoint.x, pinchPoint.y, ringSize * 2);

      // Crosshair HUD
      p.stroke(185, 100, 100, 0.9 * strength);
      p.strokeWeight(1);
      p.line(pinchPoint.x - 20, pinchPoint.y, pinchPoint.x + 20, pinchPoint.y);
      p.line(pinchPoint.x, pinchPoint.y - 20, pinchPoint.x, pinchPoint.y + 20);

      // Kanji indicator
      p.fill(50, 100, 100, strength);
      p.noStroke();
      p.textSize(12);
      p.textAlign(p.CENTER, p.CENTER);
      p.text('重力歪曲 // ' + Math.floor(strength * 100) + '%', pinchPoint.x, pinchPoint.y - 30);
      p.pop();
    }

    // --- Gesture 3: Cyber Shockwave (Fist) ---
    let lastShockwaveFrame = 0;
    function triggerFistShockwave(p, origin) {
      if (p.frameCount - lastShockwaveFrame < 25) return; // cooldown to prevent flooding
      lastShockwaveFrame = p.frameCount;

      audio.playShockwaveBoom();
      state.screenShake = 16;
      state.glitchFlashTimer = 6;

      particles.shockwaves.push(new ShockwaveRing(origin.x, origin.y, 420));

      // Explode existing particles outward
      for (let pt of particles.sakura) {
        const d = p.dist(pt.x, pt.y, origin.x, origin.y);
        if (d < 300 && d > 5) {
          const pushForce = ((300 - d) / 300) * 22;
          pt.vx += ((pt.x - origin.x) / d) * pushForce;
          pt.vy += ((pt.y - origin.y) / d) * pushForce;
        }
      }

      // Spawn burst of glitch fragments
      for (let i = 0; i < 14; i++) {
        particles.glitches.push(new GlitchFragment(origin.x, origin.y));
      }
    }

    // --- Gesture 6: Laser Trail (Pointing Finger) ---
    function triggerLaserTrail(p, tip) {
      audio.playLaserZap();

      // Push laser path point
      particles.laserPoints.push({
        x: tip.x,
        y: tip.y,
        life: 1.0,
        age: 0
      });

      // Sparks
      for (let i = 0; i < 3; i++) {
        const angle = p.random(p.TWO_PI);
        const spd = p.random(3, 10);
        particles.laserSparks.push(new LaserSpark(tip.x, tip.y, Math.cos(angle) * spd, Math.sin(angle) * spd));
      }

      // Fingertip Reticle HUD
      p.push();
      p.translate(tip.x, tip.y);
      p.noFill();
      p.stroke(185, 100, 100, 0.9);
      p.strokeWeight(1.5);
      const rot = p.frameCount * 0.08;
      p.rotate(rot);

      p.ellipse(0, 0, 36, 36);
      p.line(-24, 0, 24, 0);
      p.line(0, -24, 0, 24);

      // Target lock kanji
      p.fill(50, 100, 100, 0.9);
      p.noStroke();
      p.textSize(10);
      p.text('照準ロック', 22, -18);
      p.pop();
    }

    // --- Gesture 4: Neon Rift (Two Hands Apart) ---
    function triggerNeonRift(p, posA, posB, dist) {
      audio.playRiftElectric();
      riftElectricTicks++;

      p.push();
      // Draw dynamic jagged electric lightning arcs between posA and posB
      const segments = 14;
      const dx = (posB.x - posA.x) / segments;
      const dy = (posB.y - posA.y) / segments;
      const normalX = -(posB.y - posA.y) / dist;
      const normalY = (posB.x - posA.x) / dist;

      // Layer 1: Wide electric glow (magenta)
      p.noFill();
      p.stroke(320, 100, 100, 0.6);
      p.strokeWeight(6);
      p.beginShape();
      p.vertex(posA.x, posA.y);
      for (let s = 1; s < segments; s++) {
        const offset = Math.sin(s * 0.8 + riftElectricTicks * 0.4) * (p.random(-25, 25) * (state.glitchIntensity / 50));
        p.vertex(posA.x + dx * s + normalX * offset, posA.y + dy * s + normalY * offset);
      }
      p.vertex(posB.x, posB.y);
      p.endShape();

      // Layer 2: Sharp electric core (cyan / white)
      p.stroke(185, 100, 100, 0.95);
      p.strokeWeight(2.5);
      p.beginShape();
      p.vertex(posA.x, posA.y);
      for (let s = 1; s < segments; s++) {
        const offset = Math.cos(s * 1.2 + riftElectricTicks * 0.5) * (p.random(-15, 15) * (state.glitchIntensity / 50));
        p.vertex(posA.x + dx * s + normalX * offset, posA.y + dy * s + normalY * offset);
      }
      p.vertex(posB.x, posB.y);
      p.endShape();

      // Horizontal glitch tears along the rift
      if (p.random() < 0.4) {
        const midX = (posA.x + posB.x) / 2 + p.random(-80, 80);
        const midY = (posA.y + posB.y) / 2 + p.random(-80, 80);
        particles.glitches.push(new GlitchFragment(midX, midY));
      }

      // Energy Telemetry at midpoint
      const midX = (posA.x + posB.x) / 2;
      const midY = (posA.y + posB.y) / 2;
      p.fill(50, 100, 100, 0.9);
      p.noStroke();
      p.textSize(11);
      p.textAlign(p.CENTER, p.CENTER);
      p.text('⚡ 断層電圧: ' + Math.floor(dist * 1.4) + ' kV', midX, midY - 20);
      p.pop();
    }

    // --- Gesture 5: Gravity Collapse (Two Hands Close) ---
    let lastCollapseExplosionFrame = 0;
    function triggerGravityCollapse(p, posA, posB, dist) {
      const midX = (posA.x + posB.x) / 2;
      const midY = (posA.y + posB.y) / 2;

      // If hands are exceptionally close, trigger a mega supernova explosion!
      if (dist < p.width * 0.08) {
        if (p.frameCount - lastCollapseExplosionFrame > 35) {
          lastCollapseExplosionFrame = p.frameCount;
          audio.playSupernovaBoom();
          state.screenShake = 28;
          state.screenFlash = 1.0;
          particles.shockwaves.push(new ShockwaveRing(midX, midY, 600));
          for (let i = 0; i < 25; i++) {
            particles.glitches.push(new GlitchFragment(midX, midY));
          }
          // Blast sakura particles outward
          for (let pt of particles.sakura) {
            const angle = p.random(p.TWO_PI);
            const force = p.random(15, 30);
            pt.vx = Math.cos(angle) * force;
            pt.vy = Math.sin(angle) * force;
          }
        }
        return;
      }

      // Gravitational singularity pull: spawn accretion particles
      for (let i = 0; i < 4; i++) {
        const spawnAngle = p.random(p.TWO_PI);
        const spawnDist = p.random(80, 240);
        particles.collapse.push(
          new CollapseParticle(midX + Math.cos(spawnAngle) * spawnDist, midY + Math.sin(spawnAngle) * spawnDist, midX, midY)
        );
      }

      // Accretion disk rings
      p.push();
      p.translate(midX, midY);
      p.noFill();
      const pulse = Math.sin(p.frameCount * 0.15) * 8;

      p.stroke(270, 100, 100, 0.85); // Purple event horizon
      p.strokeWeight(3);
      p.ellipse(0, 0, dist * 0.8 + pulse, dist * 0.8 + pulse);

      p.stroke(185, 100, 100, 0.6); // Cyan counter-ring
      p.strokeWeight(1.5);
      p.rotate(p.frameCount * 0.05);
      p.rectMode(p.CENTER);
      p.rect(0, 0, dist * 0.5, dist * 0.5);

      p.fill(0, 0, 100, 0.9);
      p.noStroke();
      p.textSize(10);
      p.textAlign(p.CENTER, p.CENTER);
      p.text('崩壊臨界点: ' + Math.floor(dist) + ' px', 0, -dist * 0.5 - 12);
      p.pop();
    }

    // --- Simulator & Mouse Interaction ---
    function processSimulatorInteraction(p) {
      if (!state.mouseInteraction.isDown) return;

      const mx = p.mouseX;
      const my = p.mouseY;
      const mode = state.mouseInteraction.mode;

      if (mode === 'sakura') {
        triggerSakuraBurst(p, { x: mx, y: my });
        updateGestureBanner('SAKURA BURST', '桜花繚乱', 'Demo: Sakura petal burst simulation');
      } else if (mode === 'pinch') {
        triggerGlitchGrip(p, { x: mx, y: my }, 0.9);
        updateGestureBanner('GLITCH GRIP', '重力把持', 'Demo: Gravitational pinch vortex simulation');
      } else if (mode === 'shockwave') {
        triggerFistShockwave(p, { x: mx, y: my });
        updateGestureBanner('CYBER SHOCKWAVE', '電脳衝撃波', 'Demo: Fist shockwave simulation');
      } else if (mode === 'laser') {
        triggerLaserTrail(p, { x: mx, y: my });
        updateGestureBanner('LASER TRAIL', '閃光切断', 'Demo: Laser pointing beam simulation');
      } else if (mode === 'rift') {
        const posA = { x: mx - 180, y: my };
        const posB = { x: mx + 180, y: my };
        triggerNeonRift(p, posA, posB, 360);
        updateGestureBanner('NEON RIFT', 'ネオン断層', 'Demo: Dual-hand spatial rift simulation');
      } else if (mode === 'collapse') {
        const posA = { x: mx - 60, y: my };
        const posB = { x: mx + 60, y: my };
        triggerGravityCollapse(p, posA, posB, 120);
        updateGestureBanner('GRAVITY COLLAPSE', '重力崩壊', 'Demo: Gravity collapse singularity simulation');
      } else {
        // Free mode: drag creates laser trail & interactive ripples
        triggerLaserTrail(p, { x: mx, y: my });
      }
    }

    // --- Update & Draw All Particle Systems ---
    function updateAndDrawParticles(p) {
      // 1. Sakura Petals
      p.blendMode(p.ADD);
      for (let i = particles.sakura.length - 1; i >= 0; i--) {
        const petal = particles.sakura[i];
        petal.update();
        petal.draw(p);
        if (!petal.isAlive) {
          particles.sakura.splice(i, 1);
        }
      }

      // 2. Shockwaves
      p.blendMode(p.BLEND);
      for (let i = particles.shockwaves.length - 1; i >= 0; i--) {
        const sw = particles.shockwaves[i];
        sw.update();
        sw.draw(p);
        if (!sw.isAlive) {
          particles.shockwaves.splice(i, 1);
        }
      }

      // 3. Laser Ribbon & Sparks
      p.blendMode(p.ADD);
      // Laser trail ribbon
      if (particles.laserPoints.length > 1) {
        p.noFill();
        for (let i = 0; i < particles.laserPoints.length - 1; i++) {
          const ptA = particles.laserPoints[i];
          const ptB = particles.laserPoints[i + 1];
          const life = ptB.life;

          // Multi-layer glowing beam
          p.stroke(185, 100, 100, life * 0.9);
          p.strokeWeight(4 * life);
          p.line(ptA.x, ptA.y, ptB.x, ptB.y);

          p.stroke(0, 0, 100, life);
          p.strokeWeight(1.5 * life);
          p.line(ptA.x, ptA.y, ptB.x, ptB.y);
        }
      }

      // Fade laser points
      for (let i = particles.laserPoints.length - 1; i >= 0; i--) {
        particles.laserPoints[i].life -= 0.04;
        if (particles.laserPoints[i].life <= 0) {
          particles.laserPoints.splice(i, 1);
        }
      }

      // Laser sparks
      for (let i = particles.laserSparks.length - 1; i >= 0; i--) {
        const spark = particles.laserSparks[i];
        spark.update();
        spark.draw(p);
        if (spark.life <= 0) {
          particles.laserSparks.splice(i, 1);
        }
      }

      // 4. Glitch Fragment Blocks
      p.blendMode(p.BLEND);
      for (let i = particles.glitches.length - 1; i >= 0; i--) {
        const gf = particles.glitches[i];
        gf.update();
        gf.draw(p);
        if (gf.life <= 0) {
          particles.glitches.splice(i, 1);
        }
      }

      // 5. Gravity Collapse Particles
      p.blendMode(p.ADD);
      for (let i = particles.collapse.length - 1; i >= 0; i--) {
        const cp = particles.collapse[i];
        cp.update(cp.targetX, cp.targetY);
        cp.draw(p);
        if (!cp.isAlive) {
          particles.collapse.splice(i, 1);
        }
      }

      p.blendMode(p.BLEND);
    }

    // --- Futuristic Hand Landmarks & Skeleton Overlay ---
    function drawHandOverlays(p) {
      if (!state.hands || state.hands.length === 0) return;

      // Skeleton bone connections (21 landmarks)
      const fingerConnections = [
        [0, 1, 2, 3, 4],       // Thumb
        [0, 5, 6, 7, 8],       // Index
        [0, 9, 10, 11, 12],    // Middle
        [0, 13, 14, 15, 16],   // Ring
        [0, 17, 18, 19, 20],   // Pinky
        [5, 9, 13, 17, 0]      // Palm cross-links
      ];

      for (let h = 0; h < state.hands.length; h++) {
        const hand = state.hands[h];
        const lm = hand.landmarks;
        const handedness = hand.handedness || (h === 0 ? 'Right' : 'Left');
        const wrist = getLandmarkScreenPos(p, lm[0]);
        const palmCenter = getLandmarkScreenPos(p, lm[9]);

        p.push();

        // 1. Draw glowing skeleton bones
        p.stroke(185, 100, 100, 0.45);
        p.strokeWeight(1.8);
        for (let chain of fingerConnections) {
          for (let i = 0; i < chain.length - 1; i++) {
            const p1 = getLandmarkScreenPos(p, lm[chain[i]]);
            const p2 = getLandmarkScreenPos(p, lm[chain[i + 1]]);
            p.line(p1.x, p1.y, p2.x, p2.y);
          }
        }

        // 2. Draw knuckle nodes
        for (let i = 0; i < lm.length; i++) {
          const pt = getLandmarkScreenPos(p, lm[i]);
          p.noStroke();

          // Fingertips have special neon accent halos
          if (i === 4 || i === 8 || i === 12 || i === 16 || i === 20) {
            p.fill(320, 100, 100, 0.85); // Magenta tip
            p.ellipse(pt.x, pt.y, 9, 9);
            p.fill(0, 0, 100, 0.95);
            p.ellipse(pt.x, pt.y, 4, 4);
          } else {
            p.fill(185, 100, 100, 0.7); // Cyan knuckle
            p.ellipse(pt.x, pt.y, 6, 6);
          }
        }

        // 3. Futuristic Holographic Wrist Telemetry
        p.translate(wrist.x, wrist.y);
        p.noFill();
        p.stroke(185, 100, 100, 0.5);
        p.strokeWeight(1);
        p.ellipse(0, 0, 48, 48);

        // Rotating compass notches
        const rot = p.frameCount * 0.03 * (h % 2 === 0 ? 1 : -1);
        p.rotate(rot);
        for (let a = 0; a < 4; a++) {
          const ang = (a / 4) * Math.PI * 2;
          p.line(Math.cos(ang) * 20, Math.sin(ang) * 20, Math.cos(ang) * 24, Math.sin(ang) * 24);
        }
        p.rotate(-rot);

        // Japanese telemetry readout
        p.fill(185, 100, 100, 0.8);
        p.noStroke();
        p.textSize(9);
        p.textAlign(p.LEFT, p.CENTER);
        p.text(`[${handedness.toUpperCase()}: 接続済]`, 32, -8);
        p.text(`X:${Math.floor(wrist.x)} Y:${Math.floor(wrist.y)}`, 32, 6);

        p.pop();
      }
    }

    // --- Post-Processing: Glitch Slices & Screen Flash ---
    function drawGlitchPostProcessing(p) {
      // White supernova flash
      if (state.screenFlash > 0) {
        p.push();
        p.noStroke();
        p.fill(0, 0, 100, state.screenFlash);
        p.rect(0, 0, p.width, p.height);
        state.screenFlash *= 0.85;
        if (state.screenFlash < 0.01) state.screenFlash = 0;
        p.pop();
      }

      // Chromatic Glitch Flash (Horizontal Slices)
      if (state.glitchFlashTimer > 0) {
        state.glitchFlashTimer--;
        const sliceCount = Math.floor(p.random(3, 8));
        p.push();
        for (let i = 0; i < sliceCount; i++) {
          const sy = p.random(p.height);
          const sh = p.random(8, 35);
          const shift = (p.random() - 0.5) * 35 * (state.glitchIntensity / 50);

          p.copy(0, sy, p.width, sh, shift, sy, p.width, sh);

          // Subtle RGB color strip overlay on the slice
          p.noStroke();
          p.fill(i % 2 === 0 ? 330 : 185, 100, 100, 0.25);
          p.rect(0, sy, p.width, sh);
        }
        p.pop();
      }
    }

    // Helper: Map MediaPipe Normalized Coordinates to Screen Canvas
    function getLandmarkScreenPos(p, landmark) {
      if (!landmark) return { x: 0, y: 0 };
      let nx = landmark.x;
      // Mirroring: webcam is mirrored by default for natural interaction
      if (state.isMirror) {
        nx = 1.0 - nx;
      }
      return {
        x: nx * p.width,
        y: landmark.y * p.height
      };
    }

    // Helper: Update Telemetry DOM
    function updateTelemetryDOM(p) {
      const fpsEl = document.getElementById('fps-counter');
      const handsCountEl = document.getElementById('detected-hands-count');
      const particleCounterEl = document.getElementById('particle-counter');

      if (fpsEl) fpsEl.textContent = Math.round(p.frameRate());
      if (handsCountEl) {
        const count = state.hands.length;
        handsCountEl.textContent = `${count} ${count === 1 ? 'HAND' : 'HANDS'}`;
      }
      if (particleCounterEl) {
        const total =
          particles.sakura.length +
          particles.shockwaves.length +
          particles.laserPoints.length +
          particles.laserSparks.length +
          particles.glitches.length +
          particles.collapse.length;
        particleCounterEl.textContent = total;
      }
    }

    // Helper: Update Gesture Banner
    function updateGestureBanner(name, kanji, desc) {
      const banner = document.getElementById('gesture-banner');
      const nameEl = document.getElementById('active-gesture-name');
      const kanjiEl = document.getElementById('active-gesture-kanji');
      const descEl = document.getElementById('active-gesture-desc');

      if (banner && nameEl && kanjiEl && descEl) {
        nameEl.textContent = name;
        kanjiEl.textContent = kanji;
        descEl.textContent = desc;

        banner.classList.add('active-trigger');
        clearTimeout(banner._timeout);
        banner._timeout = setTimeout(() => {
          banner.classList.remove('active-trigger');
        }, 1200);
      }
    }

    // Mouse Listeners for Drawing & Simulation
    p.mousePressed = () => {
      audio.init();
      state.mouseInteraction.isDown = true;
      state.mouseInteraction.x = p.mouseX;
      state.mouseInteraction.y = p.mouseY;
    };

    p.mouseReleased = () => {
      state.mouseInteraction.isDown = false;
    };

    p.mouseDragged = () => {
      state.mouseInteraction.x = p.mouseX;
      state.mouseInteraction.y = p.mouseY;
    };

    // Public method to clear particles
    window.clearAllParticles = () => {
      particles.sakura = [];
      particles.shockwaves = [];
      particles.laserPoints = [];
      particles.laserSparks = [];
      particles.glitches = [];
      particles.collapse = [];
    };

    // Public method to snapshot
    window.captureSnapshot = () => {
      p.saveCanvas('GlitchGrip_' + Date.now(), 'png');
    };
  });

  // --- MediaPipe Hands Detection Pipeline ---
  let mediaPipeHands = null;
  let cameraInstance = null;
  let videoElement = null;

  function initMediaPipe() {
    videoElement = document.getElementById('webcam-video');

    if (!window.Hands) {
      console.warn('MediaPipe Hands script not loaded yet. Waiting...');
      setTimeout(initMediaPipe, 500);
      return;
    }

    try {
      mediaPipeHands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      mediaPipeHands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.55
      });

      mediaPipeHands.onResults((results) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          state.hands = results.multiHandLandmarks.map((lm, idx) => {
            const handedness = results.multiHandedness && results.multiHandedness[idx]
              ? results.multiHandedness[idx].label
              : idx === 0 ? 'Right' : 'Left';
            return {
              landmarks: lm,
              handedness: handedness
            };
          });
        } else {
          state.hands = [];
        }
      });

      console.log('MediaPipe Hands initialized successfully.');
    } catch (err) {
      console.error('Error initializing MediaPipe Hands:', err);
    }
  }

  // Start Camera Stream
  async function startWebcam() {
    const statusEl = document.getElementById('system-status');
    const promptCard = document.getElementById('camera-prompt-card');
    const camBtn = document.getElementById('btn-camera');

    if (!videoElement) {
      videoElement = document.getElementById('webcam-video');
    }

    if (statusEl) {
      statusEl.textContent = 'CONNECTING';
      statusEl.className = 'pill-value status-init';
    }

    try {
      if (window.Camera && videoElement) {
        cameraInstance = new window.Camera(videoElement, {
          onFrame: async () => {
            if (mediaPipeHands && videoElement.readyState >= 2) {
              await mediaPipeHands.send({ image: videoElement });
            }
          },
          width: 640,
          height: 480
        });

        await cameraInstance.start();
      } else {
        // Native getUserMedia fallback
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        });
        videoElement.srcObject = stream;
        await videoElement.play();

        const processLoop = async () => {
          if (state.cameraActive && mediaPipeHands && videoElement.readyState >= 2) {
            await mediaPipeHands.send({ image: videoElement });
          }
          if (state.cameraActive) {
            requestAnimationFrame(processLoop);
          }
        };
        requestAnimationFrame(processLoop);
      }

      state.cameraActive = true;
      state.cameraInitialized = true;

      if (promptCard) promptCard.classList.add('hidden');
      if (statusEl) {
        statusEl.textContent = 'NEURAL ACTIVE';
        statusEl.className = 'pill-value status-active';
      }
      if (camBtn) {
        camBtn.classList.add('active');
        camBtn.querySelector('.btn-label').textContent = 'CAM: ON';
      }
    } catch (err) {
      console.warn('Webcam stream failed or permission denied:', err);
      if (statusEl) {
        statusEl.textContent = 'DEMO / MOUSE';
        statusEl.className = 'pill-value status-warn';
      }
      if (promptCard) promptCard.classList.add('hidden');
      const camStatusText = document.getElementById('camera-status-text');
      if (camStatusText) {
        camStatusText.textContent = 'Webcam unavailable. Interactive mouse & demo preset simulator active!';
      }
    }
  }

  function stopWebcam() {
    const camBtn = document.getElementById('btn-camera');
    const statusEl = document.getElementById('system-status');

    if (cameraInstance && cameraInstance.stop) {
      cameraInstance.stop();
    }
    if (videoElement && videoElement.srcObject) {
      const stream = videoElement.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((t) => t.stop());
      videoElement.srcObject = null;
    }

    state.cameraActive = false;
    state.hands = [];

    if (camBtn) {
      camBtn.classList.remove('active');
      camBtn.querySelector('.btn-label').textContent = 'WEBCAM';
    }
    if (statusEl) {
      statusEl.textContent = 'DEMO / MOUSE';
      statusEl.className = 'pill-value status-init';
    }
  }

  // --- Initialize DOM Event Handlers ---
  function initDomEvents() {
    // Top Controls
    const btnAudio = document.getElementById('btn-audio');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        audio.init();
        audio.isMuted = !audio.isMuted;
        btnAudio.querySelector('.btn-label').textContent = audio.isMuted ? 'AUDIO: OFF' : 'AUDIO: ON';
        btnAudio.classList.toggle('active', !audio.isMuted);
      });
    }

    const btnCamera = document.getElementById('btn-camera');
    if (btnCamera) {
      btnCamera.addEventListener('click', () => {
        audio.init();
        if (state.cameraActive) {
          stopWebcam();
        } else {
          startWebcam();
        }
      });
    }

    const btnSnapshot = document.getElementById('btn-snapshot');
    if (btnSnapshot) {
      btnSnapshot.addEventListener('click', () => {
        audio.init();
        if (window.captureSnapshot) window.captureSnapshot();
      });
    }

    const btnHelp = document.getElementById('btn-help');
    const guideModal = document.getElementById('guide-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnStartNow = document.getElementById('btn-start-now');

    if (btnHelp && guideModal) {
      btnHelp.addEventListener('click', () => {
        audio.init();
        guideModal.classList.remove('hidden');
      });
    }

    if (btnCloseModal && guideModal) {
      btnCloseModal.addEventListener('click', () => guideModal.classList.add('hidden'));
    }
    if (btnStartNow && guideModal) {
      btnStartNow.addEventListener('click', () => {
        audio.init();
        guideModal.classList.add('hidden');
        if (!state.cameraActive) startWebcam();
      });
    }

    // Camera Prompt Card Actions
    const btnRequestCam = document.getElementById('btn-request-cam');
    const btnDismissCam = document.getElementById('btn-dismiss-cam');
    const promptCard = document.getElementById('camera-prompt-card');

    if (btnRequestCam) {
      btnRequestCam.addEventListener('click', () => {
        audio.init();
        startWebcam();
      });
    }

    if (btnDismissCam && promptCard) {
      btnDismissCam.addEventListener('click', () => {
        audio.init();
        promptCard.classList.add('hidden');
      });
    }

    // Bottom Preset Buttons (Demo Mode & Simulation)
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        audio.init();
        const preset = btn.getAttribute('data-preset');
        state.mouseInteraction.mode = preset;
        state.mouseInteraction.isDown = true;

        // Visual flash on button
        btn.classList.add('active-glow');
        setTimeout(() => btn.classList.remove('active-glow'), 600);

        // Auto release after burst
        setTimeout(() => {
          state.mouseInteraction.isDown = false;
        }, 400);
      });
    });

    // Sliders
    const sliderGlitch = document.getElementById('slider-glitch');
    if (sliderGlitch) {
      sliderGlitch.addEventListener('input', (e) => {
        state.glitchIntensity = parseFloat(e.target.value);
      });
    }

    const sliderDensity = document.getElementById('slider-density');
    if (sliderDensity) {
      sliderDensity.addEventListener('input', (e) => {
        state.particleDensity = parseFloat(e.target.value);
      });
    }

    // Mirror Toggle
    const btnMirror = document.getElementById('btn-mirror');
    if (btnMirror) {
      btnMirror.addEventListener('click', () => {
        state.isMirror = !state.isMirror;
        btnMirror.textContent = state.isMirror ? 'MIRROR: ON' : 'MIRROR: OFF';
      });
    }

    // HUD Toggle
    const btnHUD = document.getElementById('btn-hud');
    if (btnHUD) {
      btnHUD.addEventListener('click', () => {
        document.body.classList.toggle('hud-hidden');
        btnHUD.textContent = document.body.classList.contains('hud-hidden') ? 'HUD: HIDE' : 'HUD: SHOW';
      });
    }

    // Clear Screen
    const btnClear = document.getElementById('btn-clear');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        if (window.clearAllParticles) window.clearAllParticles();
      });
    }

    // Keyboard Shortcuts for Instant Testing
    window.addEventListener('keydown', (e) => {
      audio.init();
      switch (e.key) {
        case '1':
          state.mouseInteraction.mode = 'sakura';
          state.mouseInteraction.isDown = true;
          setTimeout(() => (state.mouseInteraction.isDown = false), 350);
          break;
        case '2':
          state.mouseInteraction.mode = 'pinch';
          state.mouseInteraction.isDown = true;
          setTimeout(() => (state.mouseInteraction.isDown = false), 500);
          break;
        case '3':
          state.mouseInteraction.mode = 'shockwave';
          state.mouseInteraction.isDown = true;
          setTimeout(() => (state.mouseInteraction.isDown = false), 400);
          break;
        case '4':
          state.mouseInteraction.mode = 'laser';
          state.mouseInteraction.isDown = true;
          setTimeout(() => (state.mouseInteraction.isDown = false), 500);
          break;
        case '5':
          state.mouseInteraction.mode = 'rift';
          state.mouseInteraction.isDown = true;
          setTimeout(() => (state.mouseInteraction.isDown = false), 500);
          break;
        case '6':
          state.mouseInteraction.mode = 'collapse';
          state.mouseInteraction.isDown = true;
          setTimeout(() => (state.mouseInteraction.isDown = false), 500);
          break;
        case 'c':
        case 'C':
          if (window.clearAllParticles) window.clearAllParticles();
          break;
      }
    });
  }

  // Initialize MediaPipe when script loads
  window.addEventListener('DOMContentLoaded', () => {
    initMediaPipe();
  });
})();

/**
 * Operação Precisão - Tactical Shooter
 * Vanilla JavaScript Engine
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const hud = document.getElementById('hud');
const ammoDisplay = document.getElementById('ammo');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('mission-timer');
const reloadPrompt = document.getElementById('reload-prompt');

// Game Constants
const MAX_AMMO = 15;
const MISSION_TIME = 60; // seconds

// Game State
let gameState = {
    active: false,
    score: 0,
    ammo: MAX_AMMO,
    timeLeft: MISSION_TIME,
    mouse: { x: 0, y: 0 },
    targets: [],
    lastTime: 0,
    nextSpawn: 0,
    particles: []
};

// Assets
const assets = {
    bg: document.getElementById('asset-bg'),
    target: document.getElementById('asset-target'),
    crosshair: document.getElementById('asset-crosshair')
};

// Initialize Canvas
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Input Handling
window.addEventListener('mousemove', (e) => {
    gameState.mouse.x = e.clientX;
    gameState.mouse.y = e.clientY;
});

// Disable context menu for right-click shooting
window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('mousedown', (e) => {
    if (!gameState.active) return;

    if (e.button === 2) { // Right Click - Shoot
        shoot();
    } else if (e.button === 0) { // Left Click - Reload
        reload();
    }
});

function shoot() {
    if (gameState.ammo > 0) {
        gameState.ammo--;
        updateHUD();
        createMuzzleFlash();
        checkHit();
        // Play shoot sound placeholder
        playSound('shoot');
    } else {
        // Play empty sound placeholder
        playSound('empty');
        reloadPrompt.classList.remove('hidden');
    }
}

function reload() {
    if (gameState.ammo < MAX_AMMO) {
        gameState.ammo = MAX_AMMO;
        updateHUD();
        reloadPrompt.classList.add('hidden');
        playSound('reload');
    }
}

function updateHUD() {
    ammoDisplay.innerText = `${gameState.ammo} / ${MAX_AMMO}`;
    scoreDisplay.innerText = gameState.score.toString().padStart(6, '0');
    
    const mins = Math.floor(gameState.timeLeft / 60);
    const secs = Math.floor(gameState.timeLeft % 60);
    timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Particle Class for Visual Feedback
class Particle {
    constructor(x, y, color, speed, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * speed;
        this.vy = (Math.random() - 0.5) * speed;
        this.life = life;
        this.maxLife = life;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Target Class
class Target {
    constructor() {
        this.width = 100;
        this.height = 150;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = Math.random() * (canvas.height - this.height);
        this.life = 2000; // ms to stay visible
        this.spawnTime = Date.now();
        this.isHit = false;
    }

    draw() {
        const elapsed = Date.now() - this.spawnTime;
        if (elapsed > this.life) return false;

        ctx.drawImage(assets.target, this.x, this.y, this.width, this.height);
        return true;
    }

    checkHit(mx, my) {
        if (mx > this.x && mx < this.x + this.width &&
            my > this.y && my < this.y + this.height) {
            this.isHit = true;
            return true;
        }
        return false;
    }
}

function createMuzzleFlash() {
    for (let i = 0; i < 20; i++) {
        gameState.particles.push(new Particle(gameState.mouse.x, gameState.mouse.y, '#fff', 5, 20));
    }
}

function checkHit() {
    for (let i = gameState.targets.length - 1; i >= 0; i--) {
        if (gameState.targets[i].checkHit(gameState.mouse.x, gameState.mouse.y)) {
            gameState.score += 100;
            gameState.targets.splice(i, 1);
            playSound('hit');
            // Impact effect
            for (let j = 0; j < 15; j++) {
                gameState.particles.push(new Particle(gameState.mouse.x, gameState.mouse.y, '#ff0055', 8, 30));
            }
            break;
        }
    }
}

// Simulation of sounds (using Oscillator for premium feel without files)
function playSound(type) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (type === 'shoot') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start();
        osc.stop(now + 0.1);
    } else if (type === 'hit') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start();
        osc.stop(now + 0.2);
    } else if (type === 'empty') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start();
        osc.stop(now + 0.05);
    } else if (type === 'reload') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start();
        osc.stop(now + 0.3);
    }
}

// Game Loop
function update(time) {
    if (!gameState.active) return;

    const dt = (time - gameState.lastTime) / 1000;
    gameState.lastTime = time;

    gameState.timeLeft -= dt;
    if (gameState.timeLeft <= 0) {
        endGame();
    }

    // Spawn Logic
    if (time > gameState.nextSpawn) {
        gameState.targets.push(new Target());
        gameState.nextSpawn = time + 1000 + Math.random() * 2000;
    }

    // Update Particles
    gameState.particles.forEach((p, idx) => {
        p.update();
        if (p.life <= 0) gameState.particles.splice(idx, 1);
    });

    draw();
    updateHUD();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background
    ctx.drawImage(assets.bg, 0, 0, canvas.width, canvas.height);

    // Draw Targets
    gameState.targets = gameState.targets.filter(t => t.draw());

    // Draw Particles
    gameState.particles.forEach(p => p.draw());

    // Draw Crosshair
    const cs = 64;
    ctx.drawImage(assets.crosshair, gameState.mouse.x - cs/2, gameState.mouse.y - cs/2, cs, cs);
}

function endGame() {
    gameState.active = false;
    alert(`Missão Finalizada! Score: ${gameState.score}`);
    location.reload();
}

startButton.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    gameState.active = true;
    gameState.lastTime = performance.now();
    requestAnimationFrame(update);
});

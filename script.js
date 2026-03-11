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
const RELOAD_TIME = 1000; // ms
const DAMAGE_THRESHOLD = 2000; // 2 seconds

// Game State
let gameState = {
    active: false,
    score: 0,
    ammo: MAX_AMMO,
    health: 100,
    reloading: false,
    timeLeft: MISSION_TIME,
    mouse: { x: 0, y: 0 },
    targets: [],
    lastTime: 0,
    nextSpawn: 0,
    particles: []
};

// UI Elements
const healthBar = document.getElementById('health-bar');
const reloadBarContainer = document.getElementById('reloading-bar-container');
const reloadBar = document.getElementById('reloading-bar');

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

// Disable context menu for right-click reloading
window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('mousedown', (e) => {
    if (!gameState.active || gameState.reloading) return;

    if (e.button === 0) { // Left Click - Shoot
        shoot();
    } else if (e.button === 2) { // Right Click - Reload
        startReload();
    }
});

function shoot() {
    if (gameState.ammo > 0) {
        gameState.ammo--;
        updateHUD();
        createMuzzleFlash();
        checkHit();
        playSound('shoot');
    } else {
        playSound('empty');
        reloadPrompt.classList.remove('hidden');
    }
}

function startReload() {
    if (gameState.ammo === MAX_AMMO || gameState.reloading) return;

    gameState.reloading = true;
    reloadBarContainer.style.display = 'block';
    reloadPrompt.classList.add('hidden');
    playSound('reload');

    let start = null;
    function animateReload(timestamp) {
        if (!start) start = timestamp;
        let progress = timestamp - start;
        let percent = Math.min((progress / RELOAD_TIME) * 100, 100);
        
        reloadBar.style.width = percent + '%';

        if (progress < RELOAD_TIME) {
            requestAnimationFrame(animateReload);
        } else {
            completeReload();
        }
    }
    requestAnimationFrame(animateReload);
}

function completeReload() {
    gameState.ammo = MAX_AMMO;
    gameState.reloading = false;
    reloadBarContainer.style.display = 'none';
    reloadBar.style.width = '0%';
    updateHUD();
}

function updateHUD() {
    ammoDisplay.innerText = `${gameState.ammo} / ${MAX_AMMO}`;
    scoreDisplay.innerText = gameState.score.toString().padStart(6, '0');
    healthBar.style.width = gameState.health + '%';
    
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
        this.life = 3500; // ms to stay visible
        this.spawnTime = Date.now();
        this.hasDamagedPlayer = false;
    }

    update() {
        const elapsed = Date.now() - this.spawnTime;
        if (elapsed > DAMAGE_THRESHOLD && !this.hasDamagedPlayer) {
            takeDamage(20);
            this.hasDamagedPlayer = true;
            // Visual feedback for being hit
            for (let i = 0; i < 20; i++) {
                gameState.particles.push(new Particle(canvas.width/2, canvas.height/2, '#ff0000', 15, 40));
            }
        }
        return elapsed < this.life;
    }

    draw() {
        const elapsed = Date.now() - this.spawnTime;
        
        ctx.save();
        // Danger indicator
        if (elapsed > DAMAGE_THRESHOLD) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'red';
        }
        ctx.drawImage(assets.target, this.x, this.y, this.width, this.height);
        ctx.restore();
    }

    checkHit(mx, my) {
        if (mx > this.x && mx < this.x + this.width &&
            my > this.y && my < this.y + this.height) {
            return true;
        }
        return false;
    }
}

function takeDamage(amount) {
    gameState.health -= amount;
    if (gameState.health <= 0) {
        gameState.health = 0;
        endGame("VOCÊ MORREU EM COMBATE");
    }
    updateHUD();
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
        osc.frequency.linearRampToValueAtTime(600, now + 0.3);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start();
        osc.stop(now + 0.4);
    }
}

// Game Loop
function update(time) {
    if (!gameState.active) return;

    const dt = (time - gameState.lastTime) / 1000;
    gameState.lastTime = time;

    gameState.timeLeft -= dt;
    if (gameState.timeLeft <= 0) {
        endGame("MISSÃO CONCLUÍDA");
    }

    // Spawn Logic
    if (time > gameState.nextSpawn) {
        gameState.targets.push(new Target());
        gameState.nextSpawn = time + 1200 + Math.random() * 1800;
    }

    // Update Targets & Damage check
    gameState.targets = gameState.targets.filter(t => t.update());

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
    gameState.targets.forEach(t => t.draw());

    // Draw Particles
    gameState.particles.forEach(p => p.draw());

    // Draw Crosshair
    const cs = 64;
    ctx.drawImage(assets.crosshair, gameState.mouse.x - cs/2, gameState.mouse.y - cs/2, cs, cs);
}

function endGame(msg) {
    gameState.active = false;
    document.getElementById('overlay-title').innerText = msg;
    document.getElementById('message-overlay').classList.remove('hidden');
    
    // Auto reload start screen after 3s
    setTimeout(() => {
        location.reload();
    }, 3000);
}

startButton.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    gameState.active = true;
    gameState.lastTime = performance.now();
    requestAnimationFrame(update);
});

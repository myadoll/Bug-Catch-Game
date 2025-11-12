// THE EXTERMINATOR — v3: real bug sprites, easier clicks, slower flow
// • Regular bugs (🐜 / 🪳): +1000 pts
// • Fast bugs (🕷️): +2000 pts (rare ~10%)
// • Max 2 bugs on screen, slower spawn & movement
// • Win at 20,000 pts, Lose at 10 misses

const TARGET_SCORE = 20000;
const POINTS = { regular: 1000, fast: 2000 };
const MISS_LIMIT = 10;
const MAX_ACTIVE = 2;               // fewer on screen
const FAST_PROB = 0.10;             // rare fast bug
const BASE_SPAWN_TICK_MS = 180;     // slower master ticker
const BASE_SPAWN_CHANCE = 0.045;    // lower spawn chance

const $ = (s) => document.querySelector(s);

const game = $("#game");
const hud = $("#hud");
const scoreVal = $("#scoreVal");
const missVal = $("#missVal");
const startScreen = $("#startScreen");
const winScreen = $("#winScreen");
const loseScreen = $("#loseScreen");
const finalScore = $("#finalScore");
const finalScoreLose = $("#finalScoreLose");
const playBtn = $("#playBtn");
const againBtn = $("#againBtn");
const tryBtn = $("#tryBtn");

let score = 0;
let misses = 0;
let running = false;
let spawnTimer = null;
let cleanTimer = null;

// ---------- WebAudio (simple SFX) ----------
let ctx;
function audioCtx() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { ctx = null; }
  }
  return ctx;
}
function beep({ freq=440, type="square", time=0.06, volume=0.2, slide=0 } = {}) {
  const ac = audioCtx(); if (!ac) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = 0.0001;

  o.connect(g); g.connect(ac.destination);
  const now = ac.currentTime;
  g.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), now + time);
  g.gain.exponentialRampToValueAtTime(0.0001, now + time);
  o.start(now);
  o.stop(now + time + 0.02);
}
function popSound(fast=false){ beep({ freq: fast ? 900 : 600, type: "square", time: 0.05, volume: 0.25, slide: -200 }); }
function whooshSound(){ beep({ freq: 200, type: "sine", time: 0.06, volume: 0.10, slide: 90 }); }
function winSound(){ beep({ freq: 600, type: "triangle", time: 0.12, volume: 0.25, slide: 120 }); setTimeout(()=>beep({ freq: 900, type: "triangle", time: 0.12, volume: 0.22, slide: 100 }), 120); }
function loseSound(){ beep({ freq: 300, type: "sawtooth", time: 0.12, volume: 0.25, slide: -140 }); setTimeout(()=>beep({ freq: 180, type: "sawtooth", time: 0.15, volume: 0.22, slide: -120 }), 120); }

// ---------- Helpers ----------
const rand = (min, max) => Math.random() * (max - min) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// regular bug emojis pool (visual variety)
const REGULAR_EMOJI = ["🐜","🪳"]; // ant, roach
const FAST_EMOJI = "🕷️";          // spider

// ---------- Game Flow ----------
function startGame(){
  score = 0; scoreVal.textContent = "0";
  misses = 0; missVal.textContent = "0";
  running = true;

  startScreen.classList.add("hidden");
  winScreen.classList.add("hidden");
  loseScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  game.classList.remove("hidden");
  game.innerHTML = "";

  scheduleSpawn();
  cleanTimer = setInterval(cleanUp, 2000);
}

function endGameWin(){
  running = false;
  clearInterval(spawnTimer);
  clearInterval(cleanTimer);
  finalScore.textContent = String(score);
  winScreen.classList.remove("hidden");
  winSound();
}

function endGameLose(){
  running = false;
  clearInterval(spawnTimer);
  clearInterval(cleanTimer);
  finalScoreLose.textContent = String(score);
  loseScreen.classList.remove("hidden");
  loseSound();
}

function scheduleSpawn(){
  spawnTimer = setInterval(spawnTick, BASE_SPAWN_TICK_MS);
}

function activeCount(){
  return document.querySelectorAll(".bug").length;
}

function spawnTick(){
  if (!running) return;

  // Keep concurrency low
  if (activeCount() >= MAX_ACTIVE) return;

  // Slight difficulty boost as score rises, but still chill
  const difficultyBoost = Math.min(0.02, score / 50000); // + up to 0.02
  const chance = BASE_SPAWN_CHANCE + difficultyBoost;

  if (Math.random() <= chance) spawnBug();
}

function spawnBug(){
  if (!running) return;

  const isFast = Math.random() < FAST_PROB;
  const type = isFast ? "fast" : "regular";
  const emoji = isFast ? FAST_EMOJI : pick(REGULAR_EMOJI);

  const bug = document.createElement("div");
  bug.className = `bug ${type}`;
  bug.style.left = rand(10, 90) + "vw";

  // Slower rise speeds overall
  const dur = isFast ? rand(3.8, 5.0) : rand(6.5, 8.8);
  bug.style.animation = `rise ${dur}s linear forwards`;
  bug.style.zIndex = String(10 + Math.floor(rand(0, 30)));

  // Sprite inside (big emoji)
  const sprite = document.createElement("div");
  sprite.className = "sprite";
  sprite.textContent = emoji;
  bug.appendChild(sprite);

  // Click / touch to squash (easy hitbox)
  const squash = (e) => {
    if (!running) return;
    e.stopPropagation();
    // ignore secondary mouse buttons
    if (e.button && e.button !== 0) return;
    if (bug.classList.contains("squashed")) return;
    bug.classList.add("squashed");
    score += isFast ? POINTS.fast : POINTS.regular;
    scoreVal.textContent = String(score);
    popSound(isFast);
    setTimeout(() => bug.remove(), 140);
    if (score >= TARGET_SCORE) endGameWin();
  };
  bug.addEventListener("click", squash, { passive: true });
  bug.addEventListener("touchstart", squash, { passive: true });

  // Count as miss if it escapes
  bug.addEventListener("animationend", () => {
    const escaped = !bug.classList.contains("squashed");
    bug.remove();
    if (!running || !escaped) return;
    misses += 1;
    missVal.textContent = String(misses);
    if (misses >= MISS_LIMIT) endGameLose();
  });

  game.appendChild(bug);
  whooshSound();
}

function cleanUp(){
  const bugs = [...document.querySelectorAll(".bug")];
  for (const b of bugs) {
    const rect = b.getBoundingClientRect();
    if (rect.bottom < -20) b.remove();
  }
}

// Buttons
playBtn.addEventListener("click", startGame);
againBtn.addEventListener("click", () => { winScreen.classList.add("hidden"); startGame(); });
tryBtn.addEventListener("click", () => { loseScreen.classList.add("hidden"); startGame(); });

// Pause audio when tab hidden (mobile friendly)
window.addEventListener("visibilitychange", () => {
  if (document.hidden && ctx && ctx.state === "running") ctx.suspend?.();
});

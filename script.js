// THE EXTERMINATOR — v2.1 with rare fast bugs
// • Regular bug  = +1000 pts
// • Fast bug     = +2000 pts (rare ~10% chance)
// • Win at 20,000 pts
// • Miss 10 bugs → Lose

const TARGET_SCORE = 20000;
const POINTS = { regular: 1000, fast: 2000 };
const MISS_LIMIT = 10;

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
function whooshSound(){ beep({ freq: 220, type: "sine", time: 0.07, volume: 0.12, slide: 120 }); }
function winSound(){ beep({ freq: 600, type: "triangle", time: 0.12, volume: 0.25, slide: 120 }); setTimeout(()=>beep({ freq: 900, type: "triangle", time: 0.12, volume: 0.22, slide: 100 }), 120); }
function loseSound(){ beep({ freq: 300, type: "sawtooth", time: 0.12, volume: 0.25, slide: -140 }); setTimeout(()=>beep({ freq: 180, type: "sawtooth", time: 0.15, volume: 0.22, slide: -120 }), 120); }

// ---------- Game Logic ----------
const rand = (min, max) => Math.random() * (max - min) + min;

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
  spawnTimer = setInterval(spawnBug, 100);
}

function spawnBug(){
  if (!running) return;
  const difficultyBoost = Math.min(0.5, score / 40000);
  const chance = 0.06 + difficultyBoost; // spawn probability
  if (Math.random() > chance) return;

  // Rarer fast bug (~10%)
  const type = Math.random() < 0.1 ? "fast" : "regular";

  const bug = document.createElement("div");
  bug.className = `bug ${type}`;
  bug.style.left = rand(8, 92) + "vw";

  const dur = (type === "fast") ? rand(2.0, 3.0) : rand(3.5, 6.5);
  bug.style.animation = `rise ${dur}s linear forwards`;
  bug.style.zIndex = String(10 + Math.floor(rand(0, 30)));

  const squash = (e) => {
    if (!running) return;
    e.stopPropagation();
    if (bug.classList.contains("squashed")) return;
    bug.classList.add("squashed");
    score += POINTS[type];
    scoreVal.textContent = String(score);
    popSound(type === "fast");
    setTimeout(() => bug.remove(), 160);

    if (score >= TARGET_SCORE) endGameWin();
  };
  bug.addEventListener("click", squash, { passive: true });
  bug.addEventListener("touchstart", squash, { passive: true });

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

playBtn.addEventListener("click", startGame);
againBtn.addEventListener("click", () => { winScreen.classList.add("hidden"); startGame(); });
tryBtn.addEventListener("click", () => { loseScreen.classList.add("hidden"); startGame(); });

window.addEventListener("visibilitychange", () => {
  if (document.hidden && ctx && ctx.state === "running") ctx.suspend?.();
});

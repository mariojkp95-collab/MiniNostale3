
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const tileSize = 48;
const cols = 10;
const rows = 10;
canvas.width = cols * tileSize;
canvas.height = rows * tileSize;

// UI
const hpEl = document.getElementById('playerHP');
const coinsEl = document.getElementById('playerCoins');
const potionsEl = document.getElementById('playerPotions');
const msgEl = document.getElementById('msg');

// assets
const ASSETS = {
  player: 'assets/player.png',
  enemy: 'assets/enemy.png',
  coin: 'assets/coin.png',
  potion: 'assets/potion.png',
  grass: 'assets/grass.png',
  tree: 'assets/tree.png'
};
const imgs = {};

function loadImages(list){
  const promises = [];
  for(const k in list){
    promises.push(new Promise((res,rej)=>{
      const img = new Image();
      img.src = list[k];
      img.onload = ()=>{ imgs[k]=img; res(); };
      img.onerror = rej;
    }));
  }
  return Promise.all(promises);
}

// mappa: 0 grass, 1 tree (ostacolo)
const map = [
  [0,0,0,0,0,0,0,0,0,0],
  [0,0,0,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0],
  [0,0,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,0,0,0,0],
  [0,0,0,0,0,0,0,0,1,0],
  [0,0,0,0,0,0,0,0,0,0],
  [0,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0],
];

// stato gioco
const player = {x:2,y:2,hp:100,coins:0,potions:0};
let enemies = [];
let coins = [];
let potions = [];

// helper per tiles validi
function isWalkable(x,y){
  if(x<0||x>=cols||y<0||y>=rows) return false;
  if(map[y][x]===1) return false;
  return true;
}

// spawn oggetti casuali evitando ostacoli e player
function randomEmpty(){
  let tries=0;
  while(tries<200){
    const x = Math.floor(Math.random()*cols);
    const y = Math.floor(Math.random()*rows);
    if(!isWalkable(x,y)) { tries++; continue; }
    if(x===player.x && y===player.y){ tries++; continue; }
    // evitare collisione con altri entità
    const taken = enemies.some(e=>e.x===x && e.y===y) || coins.some(c=>c.x===x && c.y===y) || potions.some(p=>p.x===x && p.y===y);
    if(taken) { tries++; continue; }
    return {x,y};
  }
  return {x:0,y:0};
}

function spawnEntities(){
  enemies = [];
  coins = [];
  potions = [];
  // 3 nemici
  for(let i=0;i<3;i++){
    const pos = randomEmpty();
    enemies.push({x:pos.x,y:pos.y});
  }
  // 6 monete
  for(let i=0;i<6;i++){
    const pos = randomEmpty();
    coins.push({x:pos.x,y:pos.y});
  }
  // 2 pozioni
  for(let i=0;i<2;i++){
    const pos = randomEmpty();
    potions.push({x:pos.x,y:pos.y});
  }
}

function draw(){
  // draw tiles
  for(let y=0;y<rows;y++){
    for(let x=0;x<cols;x++){
      const tile = map[y][x];
      if(tile===0){
        ctx.drawImage(imgs.grass, x*tileSize, y*tileSize, tileSize, tileSize);
      } else {
        ctx.drawImage(imgs.grass, x*tileSize, y*tileSize, tileSize, tileSize);
        ctx.drawImage(imgs.tree, x*tileSize, y*tileSize, tileSize, tileSize);
      }
    }
  }
  // items
  coins.forEach(c=>{ ctx.drawImage(imgs.coin, c.x*tileSize+6, c.y*tileSize+6, tileSize-12, tileSize-12); });
  potions.forEach(p=>{ ctx.drawImage(imgs.potion, p.x*tileSize+6, p.y*tileSize+2, tileSize-12, tileSize-12); });
  // enemies
  enemies.forEach(e=>{ ctx.drawImage(imgs.enemy, e.x*tileSize, e.y*tileSize, tileSize, tileSize); });
  // player (draw last)
  ctx.drawImage(imgs.player, player.x*tileSize, player.y*tileSize, tileSize, tileSize);
}

function updateHUD(){
  hpEl.textContent = player.hp;
  coinsEl.textContent = player.coins;
  potionsEl.textContent = player.potions;
}

function collectAt(x,y){
  // coins
  for(let i=coins.length-1;i>=0;i--){
    if(coins[i].x===x && coins[i].y===y){
      coins.splice(i,1);
      player.coins += 1;
      msgEl.textContent = 'Hai raccolto una moneta!';
    }
  }
  // potions
  for(let i=potions.length-1;i>=0;i--){
    if(potions[i].x===x && potions[i].y===y){
      potions.splice(i,1);
      player.potions += 1;
      msgEl.textContent = 'Hai raccolto una pozione!';
    }
  }
}

function movePlayer(dx,dy){
  const nx = player.x + dx;
  const ny = player.y + dy;
  if(!isWalkable(nx,ny)) return;
  player.x = nx; player.y = ny;
  collectAt(player.x, player.y);
  // check enemy collision: small penalty
  enemies.forEach((e, idx) => {
    if(e.x === player.x && e.y === player.y){
      player.hp = Math.max(0, player.hp - 10);
      msgEl.textContent = 'Sei stato toccato da un nemico! -10 HP';
      // respawna quel nemico in un luogo vuoto
      const pos = randomEmpty();
      e.x = pos.x; e.y = pos.y;
    }
  });
  updateHUD();
  draw();
}

// enemy movement casuale
function moveEnemies(){
  enemies.forEach(e=>{
    const dirs = [[1,0],[-1,0],[0,1],[0,-1],[0,0]];
    const d = dirs[Math.floor(Math.random()*dirs.length)];
    const nx = e.x + d[0], ny = e.y + d[1];
    if(isWalkable(nx,ny) && !(nx===player.x && ny===player.y)){
      e.x = nx; e.y = ny;
    }
  });
  draw();
}

document.getElementById('up').onclick = ()=>movePlayer(0,-1);
document.getElementById('down').onclick = ()=>movePlayer(0,1);
document.getElementById('left').onclick = ()=>movePlayer(-1,0);
document.getElementById('right').onclick = ()=>movePlayer(1,0);

// swipe controls (touch)
let touchStartX=0, touchStartY=0;
canvas.addEventListener('touchstart', (e)=>{
  const t = e.changedTouches[0];
  touchStartX = t.clientX; touchStartY = t.clientY;
});
canvas.addEventListener('touchend', (e)=>{
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  if(Math.abs(dx) > Math.abs(dy)){
    if(dx > 20) movePlayer(1,0);
    else if(dx < -20) movePlayer(-1,0);
  } else {
    if(dy > 20) movePlayer(0,1);
    else if(dy < -20) movePlayer(0,-1);
  }
});

// load and init
loadImages(ASSETS).then(()=>{
  spawnEntities();
  draw();
  updateHUD();
  // muovi nemici ogni 1200ms
  setInterval(()=>{ moveEnemies(); }, 1200);
}).catch(e=>{ console.error('Errore caricamento immagini', e); msgEl.textContent='Errore caricamento immagini.'; });

// The DOM heads-up display: order tickets with route hints and countdown bars,
// the big shift clock, score/combo/hearts, pantry bins, the plate tray and the
// title / game-over overlays. The 3D canvas shows the kitchen; this file makes
// the game readable at a glance, which is what the screenshots have to prove.
import { INGREDIENTS, FINISHED_ITEMS } from './recipes.js';

export class KitchenHUD {
  constructor(documentRef) {
    this.doc = documentRef;
    this.ticketsEl = documentRef.getElementById('tickets');
    this.clockEl = documentRef.getElementById('clockTime');
    this.rushEl = documentRef.getElementById('rushLabel');
    this.scoreEl = documentRef.getElementById('scoreVal');
    this.comboEl = documentRef.getElementById('comboVal');
    this.heartsEl = documentRef.getElementById('heartsVal');
    this.heldEl = documentRef.getElementById('heldVal');
    this.slotsEl = documentRef.getElementById('plateSlots');
    this.serveBtn = documentRef.getElementById('serveBtn');
    this.trashBtn = documentRef.getElementById('trashBtn');
    this.toastEl = documentRef.getElementById('toast');
    this.overlayEl = documentRef.getElementById('overlay');
    this.statusEl = documentRef.getElementById('status');
    this.binsEl = documentRef.getElementById('bins');
    this.toastTimer = null;
    this.buildPantryBins();
  }

  buildPantryBins() {
    this.binsEl.innerHTML = '';
    for (const [key, info] of Object.entries(INGREDIENTS)) {
      const bin = this.doc.createElement('div');
      bin.className = 'bin';
      bin.dataset.ingredient = key;
      bin.innerHTML = `<div class="dot" style="background:${info.color}"></div>${info.label}<br><span class="key">[${info.key}]</span>`;
      this.binsEl.appendChild(bin);
    }
  }

  itemLabel(item) {
    return INGREDIENTS[item]?.label ?? FINISHED_ITEMS[item]?.label ?? item;
  }

  itemColor(item) {
    return INGREDIENTS[item]?.color ?? FINISHED_ITEMS[item]?.color ?? '#888';
  }

  renderOrders(orders) {
    if (orders.length === 0) {
      this.ticketsEl.innerHTML = '<div class="ticket"><div class="tname">No orders yet…</div><div class="troute">The first ticket lands in a few seconds. Grab an ingredient and get ready!</div></div>';
      return;
    }
    this.ticketsEl.innerHTML = orders.map((order) => {
      const frac = Math.max(0, order.remaining / order.total);
      const urgent = frac < 0.35 ? ' urgent' : '';
      const chips = order.recipe.needs.map((n) => this.itemLabel(n)).join(' + ');
      return `<div class="ticket${urgent}">
        <div class="tname">${order.recipe.name} · ${order.recipe.points} pts</div>
        <div class="troute">${chips}<br>${order.recipe.route}</div>
        <div class="tbar"><div style="width:${Math.round(frac * 100)}%"></div></div>
        <div class="tpts">${Math.ceil(order.remaining)}s left</div>
      </div>`;
    }).join('');
  }

  renderClock(timer) {
    this.clockEl.textContent = timer.clockText();
    this.clockEl.classList.toggle('low', timer.remainingSeconds() <= 30);
    this.rushEl.textContent = timer.rushLabel();
  }

  renderScore(board) {
    this.scoreEl.textContent = String(board.score);
    this.comboEl.textContent = `Combo x${board.comboMultiplier()} · ${board.serves} served`;
    this.heartsEl.textContent = '♥'.repeat(Math.max(0, board.hearts)) + '♡'.repeat(Math.max(0, 3 - board.hearts));
  }

  renderTray(heldItem, plateItems, plateSlots) {
    this.heldEl.textContent = heldItem
      ? `Holding: ${this.itemLabel(heldItem)} — click a station or the plate`
      : 'Hands empty — grab an ingredient';
    this.slotsEl.innerHTML = '';
    for (let i = 0; i < plateSlots; i += 1) {
      const slot = this.doc.createElement('div');
      const item = plateItems[i];
      slot.className = item ? 'slot full' : 'slot';
      slot.textContent = item ? this.itemLabel(item) : 'empty';
      if (item) slot.style.background = this.itemColor(item);
      this.slotsEl.appendChild(slot);
    }
    this.serveBtn.disabled = plateItems.length === 0;
  }

  showToast(text, ms = 1800) {
    this.toastEl.textContent = text;
    this.toastEl.style.display = 'block';
    this.statusEl.textContent = text;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastEl.style.display = 'none'; }, ms);
  }

  showTitle(onStart) {
    this.overlayEl.innerHTML = `<div class="card">
      <h1>CHRONO KITCHEN</h1>
      <h3>One kitchen · three eras · every order a race through time</h3>
      <p><b>Fire-Pit Grill</b> (prehistoric) grills meat · <b>Hearth Oven</b> (medieval) bakes dough and smokes meat · <b>Nano-Cooker</b> (futuristic) turns veg and spice into salad and sauce.</p>
      <p>Grab ingredients from the <b>Pantry</b>, transform them at the right station, stack them on the <b>Assembly Counter</b> to match a ticket, then hit <b>Serve</b> before the ticket runs out. Orders get faster as the shift rushes. Three missed orders end your shift — beat <b>300 points</b> in 2:30!</p>
      <p><b>WASD / arrows</b> move · <b>click</b> or <b>E</b> use a station · <b>1–4</b> pantry · <b>Q</b> drop · <b>Space</b> serve</p>
      <button class="bigbtn" id="startBtn">▶ Start shift</button></div>`;
    this.overlayEl.style.display = 'flex';
    this.doc.getElementById('startBtn').addEventListener('click', onStart);
  }

  showGameOver(board, timer, won, onRestart) {
    const title = won ? 'SHIFT COMPLETE — YOU WIN!' : board.isGameOver() ? 'SHIFT FAILED' : 'TIME UP!';
    const verdict = won
      ? `You beat the ${300}-point target with ${board.score} points. The kitchen is yours, time-chef.`
      : `You scored ${board.score} points (target 300) with ${board.serves} dishes served and ${board.expired} orders lost.`;
    this.overlayEl.innerHTML = `<div class="card">
      <h1>${title}</h1>
      <p class="final">Score ${board.score} · ${board.serves} served · best combo x${board.comboMultiplier()}</p>
      <p>${verdict}</p>
      <button class="bigbtn" id="restartBtn">↻ Cook again (Enter)</button></div>`;
    this.overlayEl.style.display = 'flex';
    this.doc.getElementById('restartBtn').addEventListener('click', onRestart);
  }

  hideOverlay() {
    this.overlayEl.style.display = 'none';
    this.overlayEl.innerHTML = '';
  }
}

/** Camera presets for the wide view and each screenshot close-up. */
export function cameraPreset(name) {
  const presets = {
    wide: { position: [0, 12.6, 10.8], target: [0, 0, -0.4] },
    orders: { position: [2.0, 8.0, 7.0], target: [-2.0, 0.8, -0.5] },
    prep: { position: [2.8, 5.2, 5.2], target: [5.4, 1.0, 0.2] },
    service: { position: [1.5, 7.5, 8.5], target: [2.5, 0.8, 1.2] },
  };
  return presets[name] ?? presets.wide;
}

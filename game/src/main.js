// Chrono Kitchen bootstrap and game loop: builds the scene, owns the shift state
// (chef, held item, plate, station slots), routes every input to the right
// station, and drives the frame loop. Play it with keyboard + mouse; the URL
// ?shot=cover|orders|prep|service stages a frozen screenshot scene instead.
import * as THREE from 'three';
import { KITCHEN_CONFIG, STATION_DEFS, CHEF_SPAWN } from './config.js';
import { INGREDIENTS, FINISHED_ITEMS, STATION_TRANSFORMS } from './recipes.js';
import { OrderBoard } from './orders.js';
import { ShiftTimer } from './timer.js';
import { KitchenAudio } from './audio.js';
import { ChefInput } from './input.js';
import {
  buildKitchenScene, updateKitchenVisuals, refreshPlateVisuals, setStationSlotVisual,
} from './kitchen.js';
import { KitchenHUD, cameraPreset } from './render.js';
import { stageChronoShot } from './shots.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

function fitRenderer() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
}
window.addEventListener('resize', fitRenderer);
fitRenderer();

export const game = {
  state: 'title',
  frozen: false,
  cameraLocked: false,
  cameraPresetName: 'wide',
  board: new OrderBoard(),
  timer: new ShiftTimer(),
  audio: new KitchenAudio(),
  heldItem: null,
  plateItems: [],
  moveTarget: null,
  pendingInteract: null,
  pendingIngredient: null,
  kitchen: buildKitchenScene(),
  hud: new KitchenHUD(document),
  input: null,
};
game.kitchen.camera.aspect = window.innerWidth / window.innerHeight;
game.kitchen.camera.updateProjectionMatrix();
game.chef = game.kitchen.chef;
game.input = new ChefInput(canvas, game.kitchen.camera);
window.__game = game;

function syncHeldMesh() {
  const mesh = game.kitchen.heldMesh;
  mesh.visible = game.heldItem !== null;
  if (game.heldItem) mesh.material.color.setHex(game.kitchen.ingredientColorOf(game.heldItem));
}

function syncTray() {
  game.hud.renderTray(game.heldItem, game.plateItems, KITCHEN_CONFIG.plateSlots);
}

function nearestStation(maxDistance) {
  let best = null;
  let bestDistance = maxDistance;
  for (const def of STATION_DEFS) {
    const d = Math.hypot(game.chef.position.x - def.x, game.chef.position.z - def.z);
    if (d < bestDistance) { bestDistance = d; best = def; }
  }
  return best;
}

function grabIngredient(key) {
  if (game.state !== 'play' || game.frozen) return;
  if (game.heldItem) { game.hud.showToast('Hands full — use or drop it first (Q)'); return; }
  game.heldItem = key;
  game.audio.chop();
  game.hud.showToast(`${INGREDIENTS[key].label} grabbed — take it to the ${INGREDIENTS[key].verb === 'Grill' ? 'Fire-Pit' : INGREDIENTS[key].verb === 'Bake' ? 'Hearth' : 'Nano-Cooker'}`);
  syncHeldMesh();
  syncTray();
}

function collectFromStation(station) {
  const slot = station.slot;
  if (!slot || slot.progress < slot.total) return false;
  if (game.heldItem) { game.hud.showToast('Hands full — use or drop it first (Q)'); return false; }
  const result = STATION_TRANSFORMS[station.def.kind][slot.item];
  game.heldItem = result;
  station.slot = null;
  setStationSlotVisual(game.kitchen, station.def.id, null);
  game.audio.ding();
  game.hud.showToast(`${FINISHED_ITEMS[result].label} ready — plate it!`);
  syncHeldMesh();
  syncTray();
  return true;
}

function useStation(stationId, ingredientKey) {
  if (game.state !== 'play' || game.frozen) return;
  const station = game.kitchen.stations.get(stationId);
  if (!station) return;
  const kind = station.def.kind;
  game.audio.unlock();

  if (kind === 'pantry') {
    if (ingredientKey) grabIngredient(ingredientKey);
    else game.hud.showToast('Click a pantry bin — or press 1–4');
    return;
  }
  if (kind === 'plate') {
    if (!game.heldItem) { game.hud.showToast('Nothing in hand — grab an ingredient first'); return; }
    if (!FINISHED_ITEMS[game.heldItem]) {
      game.hud.showToast(`${game.hud.itemLabel(game.heldItem)} is raw — transform it at a station first!`);
      game.audio.errorBuzz();
      return;
    }
    if (game.plateItems.length >= KITCHEN_CONFIG.plateSlots) {
      game.hud.showToast('Plate is full — serve it or clear it');
      return;
    }
    game.plateItems.push(game.heldItem);
    game.heldItem = null;
    game.audio.chop();
    refreshPlateVisuals(game.kitchen, game.plateItems);
    syncHeldMesh();
    syncTray();
    return;
  }
  if (kind === 'serve') {
    servePlate();
    return;
  }
  // Processing stations: fire-pit, hearth, nano-cooker.
  if (station.slot) {
    if (!collectFromStation(station)) {
      const left = Math.ceil(station.slot.total - station.slot.progress);
      game.hud.showToast(`${FINISHED_ITEMS[STATION_TRANSFORMS[kind][station.slot.item]].label} cooking… ${left}s left`);
    }
    return;
  }
  if (!game.heldItem) { game.hud.showToast('Hands empty — grab an ingredient from the Pantry'); return; }
  const result = STATION_TRANSFORMS[kind][game.heldItem];
  if (!result) {
    game.hud.showToast(`${game.hud.itemLabel(game.heldItem)} does not belong at the ${station.def.label}`);
    game.audio.errorBuzz();
    return;
  }
  station.slot = { item: game.heldItem, progress: 0, total: KITCHEN_CONFIG.stationProcessSeconds[kind], mesh: null };
  setStationSlotVisual(game.kitchen, stationId, game.heldItem, game.kitchen.ingredientColorOf(game.heldItem));
  station.slot.mesh = station.slotMesh;
  game.heldItem = null;
  game.audio.sizzle();
  game.hud.showToast(`${INGREDIENTS[station.slot.item].verb}ing… ${station.slot.total}s`);
  syncHeldMesh();
  syncTray();
}

function servePlate() {
  if (game.state !== 'play' || game.frozen) return;
  if (game.plateItems.length === 0) { game.hud.showToast('Plate is empty — build a dish first'); return; }
  const result = game.board.servePlate(game.plateItems);
  if (!result) {
    game.audio.errorBuzz();
    game.hud.showToast(game.board.lastEvent.text);
    return;
  }
  game.plateItems = [];
  refreshPlateVisuals(game.kitchen, game.plateItems);
  game.audio.serveFanfare();
  game.hud.showToast(result.order ? `${game.board.lastEvent.text}` : 'Served!');
  syncTray();
}

function dropHeld() {
  if (game.state !== 'play' || game.frozen || !game.heldItem) return;
  game.hud.showToast(`${game.hud.itemLabel(game.heldItem)} tossed`);
  game.heldItem = null;
  syncHeldMesh();
  syncTray();
}

function clearPlate() {
  if (game.state !== 'play' || game.frozen || game.plateItems.length === 0) return;
  game.plateItems = [];
  refreshPlateVisuals(game.kitchen, game.plateItems);
  game.hud.showToast('Plate cleared');
  syncTray();
}

function walkToStation(def) {
  const side = Math.sign(def.x) || 1;
  game.moveTarget = { x: def.x - side * 1.7, z: def.z };
}

function handleClick(click) {
  if (game.state !== 'play' || game.frozen) return;
  const hit = game.input.pick(click, game.kitchen.pickMeshes);
  if (!hit) return;
  let node = hit.object;
  let stationId = null;
  let ingredient = node.userData.ingredient ?? null;
  while (node) {
    if (node.userData.stationId) { stationId = node.userData.stationId; break; }
    if (!ingredient) ingredient = node.userData.ingredient ?? null;
    node = node.parent;
  }
  if (stationId) {
    const def = STATION_DEFS.find((d) => d.id === stationId);
    walkToStation(def);
    game.pendingInteract = stationId;
    game.pendingIngredient = ingredient;
    return;
  }
  if (hit.object.userData.floor || hit.point) {
    game.moveTarget = {
      x: Math.max(-4.6, Math.min(4.6, hit.point.x)),
      z: Math.max(-4.2, Math.min(4.2, hit.point.z)),
    };
    game.pendingInteract = null;
    game.pendingIngredient = null;
  }
}

function resetShift() {
  game.board.reset();
  game.timer.reset();
  game.heldItem = null;
  game.plateItems = [];
  game.moveTarget = null;
  game.pendingInteract = null;
  game.chef.position.set(CHEF_SPAWN.x, 0, CHEF_SPAWN.z);
  game.chef.rotation.y = 0;
  for (const station of game.kitchen.stations.values()) {
    station.slot = null;
    setStationSlotVisual(game.kitchen, station.def.id, null);
  }
  refreshPlateVisuals(game.kitchen, game.plateItems);
  syncHeldMesh();
  syncTray();
  game.hud.renderOrders(game.board.orders);
  game.hud.renderClock(game.timer);
  game.hud.renderScore(game.board);
}

function startShift() {
  resetShift();
  game.state = 'play';
  game.timer.start();
  game.audio.unlock();
  game.hud.hideOverlay();
  game.hud.showToast('Shift started — first order incoming!');
}

function endShift(won) {
  game.state = 'over';
  game.hud.showGameOver(game.board, game.timer, won, startShift);
  if (won) game.audio.serveFanfare();
}

game.input.onInteract = () => {
  const def = nearestStation(2.6);
  if (def) useStation(def.id, null);
};
game.input.onDrop = dropHeld;
game.input.onServeKey = servePlate;
game.input.onPantryKey = (index) => grabIngredient(Object.keys(INGREDIENTS)[index]);
game.input.onRestartKey = () => { if (game.state === 'over') startShift(); };
game.input.onAnyKey = () => game.audio.unlock();
game.hud.binsEl.addEventListener('click', (event) => {
  const bin = event.target.closest('.bin');
  if (bin) grabIngredient(bin.dataset.ingredient);
});
game.hud.serveBtn.addEventListener('click', servePlate);
game.hud.trashBtn.addEventListener('click', clearPlate);
canvas.addEventListener('pointerdown', () => game.audio.unlock());

const clock = new THREE.Clock();
let lastTickSecond = -1;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  if (game.state === 'play' && !game.frozen) {
    game.timer.tick(dt);
    game.board.tick(dt, game.timer.elapsedSeconds);
    for (const station of game.kitchen.stations.values()) {
      if (station.slot && station.slot.progress < station.slot.total) {
        station.slot.progress = Math.min(station.slot.total, station.slot.progress + dt);
      }
    }
    // One-second tick-tock when the shift is nearly over.
    const left = Math.ceil(game.timer.remainingSeconds());
    if (left <= 10 && left !== lastTickSecond) {
      lastTickSecond = left;
      game.audio.tickTock();
    }
    if (game.board.lastEvent) {
      game.hud.renderOrders(game.board.orders);
      game.hud.renderScore(game.board);
      game.board.lastEvent = null;
    }
    game.hud.renderClock(game.timer);
    if (game.board.isGameOver()) endShift(false);
    else if (game.timer.isFinished()) endShift(game.board.score >= KITCHEN_CONFIG.targetScore);

    // Chef movement: keyboard first, then click-to-move.
    const dir = game.input.moveDirection();
    if (dir.x !== 0 || dir.z !== 0) {
      game.moveTarget = null;
      game.pendingInteract = null;
      game.chef.position.x += dir.x * KITCHEN_CONFIG.chef.speed * dt;
      game.chef.position.z += dir.z * KITCHEN_CONFIG.chef.speed * dt;
      game.chef.rotation.y = Math.atan2(dir.x, dir.z);
    } else if (game.moveTarget) {
      const dx = game.moveTarget.x - game.chef.position.x;
      const dz = game.moveTarget.z - game.chef.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.25) {
        game.moveTarget = null;
        if (game.pendingInteract) {
          const id = game.pendingInteract;
          const ingredient = game.pendingIngredient;
          game.pendingInteract = null;
          game.pendingIngredient = null;
          useStation(id, ingredient);
        }
      } else {
        game.chef.position.x += (dx / dist) * KITCHEN_CONFIG.chef.speed * dt;
        game.chef.position.z += (dz / dist) * KITCHEN_CONFIG.chef.speed * dt;
        game.chef.rotation.y = Math.atan2(dx, dz);
      }
    }
    game.chef.position.x = Math.max(-4.6, Math.min(4.6, game.chef.position.x));
    game.chef.position.z = Math.max(-4.2, Math.min(4.2, game.chef.position.z));

    const click = game.input.consumeClick();
    if (click) handleClick(click);

    // Camera follows the chef a little; locked for screenshots.
    if (!game.cameraLocked) {
      const preset = cameraPreset('wide');
      const wantX = preset.position[0] + game.chef.position.x * 0.18;
      const wantZ = preset.position[2] + game.chef.position.z * 0.12;
      game.kitchen.camera.position.x += (wantX - game.kitchen.camera.position.x) * 0.04;
      game.kitchen.camera.position.z += (wantZ - game.kitchen.camera.position.z) * 0.04;
      game.kitchen.camera.lookAt(game.chef.position.x * 0.25, 0, -0.4 + game.chef.position.z * 0.2);
    }
  }

  updateKitchenVisuals(game.kitchen, time);
  renderer.render(game.kitchen.scene, game.kitchen.camera);
}

// Screenshot mode wins over the title screen: ?shot=cover|orders|prep|service
const shotName = new URLSearchParams(window.location.search).get('shot');
if (shotName) {
  resetShift();
  stageChronoShot(shotName, game);
} else {
  game.hud.showTitle(startShift);
  game.hud.renderOrders(game.board.orders);
  game.hud.renderClock(game.timer);
  game.hud.renderScore(game.board);
  syncTray();
}
frame();

// The screenshot scenes behind ?shot=cover|orders|prep|service. Each one sets a
// real game state directly — live orders, a mid-assembly plate, a station
// mid-transform, the timer and score — then freezes the clock, so the frame a
// screenshot takes is exactly what a short game really looks like, stable
// enough to capture. No image is ever edited or composited.
import { RECIPES } from './recipes.js';
import { KITCHEN_CONFIG } from './config.js';
import { setStationSlotVisual, refreshPlateVisuals } from './kitchen.js';
import { cameraPreset } from './render.js';

function makeOrder(id, recipeId, remaining) {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  return { id, recipe, remaining, total: recipe.deadline };
}

function placeOnStation(game, stationId, item, progress, total) {
  const station = game.kitchen.stations.get(stationId);
  if (!station) return;
  setStationSlotVisual(game.kitchen, stationId, item, game.kitchen.ingredientColorOf(item));
  station.slot = { item, progress, total, mesh: station.slotMesh };
}

function applyShot(game, setup) {
  game.state = 'play';
  game.frozen = true;
  game.hud.hideOverlay();
  game.board.reset();
  game.timer.reset();
  game.heldItem = null;
  game.plateItems = [];
  for (const station of game.kitchen.stations.values()) {
    station.slot = null;
    setStationSlotVisual(game.kitchen, station.def.id, null);
  }
  setup(game);
  refreshPlateVisuals(game.kitchen, game.plateItems);
  game.hud.renderOrders(game.board.orders);
  game.hud.renderClock(game.timer);
  game.hud.renderScore(game.board);
  game.hud.renderTray(game.heldItem, game.plateItems, KITCHEN_CONFIG.plateSlots);
}

const SHOTS = {
  cover(game) {
    game.board.orders = [
      makeOrder(1, 'chrono-burger', 38),
      makeOrder(2, 'ember-steak', 22),
      makeOrder(3, 'smoke-spice', 48),
    ];
    game.board.nextOrderId = 4;
    game.board.score = 340;
    game.board.comboStreak = 4;
    game.board.serves = 5;
    game.timer.elapsedSeconds = 43;
    game.timer.running = true;
    game.plateItems = ['grilled', 'bread', 'salad'];
    game.heldItem = 'rawMeat';
    placeOnStation(game, 'firePit', 'rawMeat', 2.4, 4);
    game.chef.position.set(-4.3, 0, 0.6);
    game.chef.rotation.y = -Math.PI / 2;
    game.cameraPresetName = 'wide';
  },
  orders(game) {
    game.board.orders = [
      makeOrder(1, 'time-feast', 41),
      makeOrder(2, 'chrono-burger', 19),
      makeOrder(3, 'smoke-spice', 8),
      makeOrder(4, 'hearth-loaf', 33),
    ];
    game.board.nextOrderId = 5;
    game.board.score = 210;
    game.board.comboStreak = 2;
    game.board.serves = 3;
    game.timer.elapsedSeconds = 66;
    game.timer.running = true;
    game.plateItems = ['grilled', 'bread'];
    game.chef.position.set(-4.4, 0, -3.2);
    game.chef.rotation.y = Math.PI;
    placeOnStation(game, 'firePit', 'rawMeat', 2.4, 4);
    placeOnStation(game, 'hearth', 'dough', 3.5, 5);
    game.cameraPresetName = 'orders';
  },
  prep(game) {
    game.board.orders = [
      makeOrder(1, 'chrono-burger', 44),
      makeOrder(2, 'ember-steak', 27),
    ];
    game.board.nextOrderId = 3;
    game.board.score = 180;
    game.board.comboStreak = 2;
    game.board.serves = 2;
    game.timer.elapsedSeconds = 80;
    game.timer.running = true;
    game.plateItems = ['grilled', 'bread'];
    game.heldItem = 'salad';
    placeOnStation(game, 'nanoCooker', 'veg', 1.2, 2);
    game.chef.position.set(4.2, 0, 0.6);
    game.chef.rotation.y = Math.PI / 2;
    game.cameraPresetName = 'prep';
  },
  service(game) {
    game.board.orders = [
      makeOrder(1, 'chrono-burger', 29),
      makeOrder(2, 'time-feast', 52),
      makeOrder(3, 'ember-steak', 14),
      makeOrder(4, 'smoke-spice', 36),
    ];
    game.board.nextOrderId = 5;
    game.board.score = 520;
    game.board.comboStreak = 6;
    game.board.serves = 8;
    game.timer.elapsedSeconds = 118;
    game.timer.running = true;
    game.plateItems = ['grilled', 'bread', 'salad'];
    game.heldItem = null;
    placeOnStation(game, 'firePit', 'rawMeat', 3.8, 4);
    game.chef.position.set(4.2, 0, 1.4);
    game.chef.rotation.y = Math.PI / 2;
    game.cameraPresetName = 'service';
    game.hud.showToast('Chrono Burger served! +180', 60000);
  },
};

/**
 * Stage the named screenshot scene on a live game and move the camera to its
 * preset; any other name stages the cover. Returns the screen the game is in.
 */
export function stageChronoShot(name, game) {
  const setup = SHOTS[name] ?? SHOTS.cover;
  applyShot(game, setup);
  const preset = cameraPreset(game.cameraPresetName);
  game.kitchen.camera.position.set(...preset.position);
  game.kitchen.camera.lookAt(...preset.target);
  game.cameraLocked = true;
  return 'play';
}

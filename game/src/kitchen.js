// Builds the whole 3D kitchen: floor, walls, counters, the three era stations
// (fire-pit grill, hearth oven, nano-cooker), the pantry bins, the assembly
// plate, the serve window and the chef. Returns every handle the game loop and
// the screenshot stager need to move, light and animate it.
import * as THREE from 'three';
import { KITCHEN_CONFIG, STATION_DEFS } from './config.js';
import { INGREDIENTS, FINISHED_ITEMS } from './recipes.js';

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(rt, rb, h, color, x = 0, y = 0, z = 0, segments = 20) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(rt, rb, h, segments),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function sphere(r, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(r, 20, 14),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.05 }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

/** A thin floating progress bar that fills as a station finishes its transform. */
function makeProgressBar() {
  const group = new THREE.Group();
  const back = box(1.1, 0.16, 0.05, 0x1a1020, 0, 0, 0);
  back.castShadow = false;
  const fill = box(1.06, 0.11, 0.06, 0x7ed957, 0, 0, 0);
  fill.castShadow = false;
  group.add(back, fill);
  group.visible = false;
  return { group, fill };
}

function tagStation(group, stationId) {
  group.traverse((child) => { child.userData.stationId = stationId; });
  return group;
}

export function buildKitchenScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x241a2e);
  const cfg = KITCHEN_CONFIG.colors;

  const camera = new THREE.PerspectiveCamera(46, 1280 / 720, 0.1, 100);
  camera.position.set(0, 12.6, 10.8);
  camera.lookAt(0, 0, -0.4);

  scene.add(new THREE.AmbientLight(0xfff2dd, 0.85));
  const sun = new THREE.DirectionalLight(0xffe8c0, 1.6);
  sun.position.set(4, 12, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  // Floor: warm wood planks suggested by alternating strips.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(KITCHEN_CONFIG.room.width, KITCHEN_CONFIG.room.depth),
    new THREE.MeshStandardMaterial({ color: cfg.floor, roughness: 0.9 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData.floor = true;
  scene.add(floor);
  for (let i = 0; i < 7; i += 1) {
    const strip = box(0.08, 0.02, KITCHEN_CONFIG.room.depth, 0x6e5238, -6 + i * 2, 0.011, 0);
    strip.castShadow = false;
    scene.add(strip);
  }
  // Back wall and side walls frame the single coherent kitchen.
  const backWall = box(KITCHEN_CONFIG.room.width, KITCHEN_CONFIG.room.wallHeight, 0.3, cfg.wallBack, 0, 2.1, -5.1);
  const leftWall = box(0.3, KITCHEN_CONFIG.room.wallHeight, KITCHEN_CONFIG.room.depth, cfg.wallSide, -7.1, 2.1, 0);
  const rightWall = box(0.3, KITCHEN_CONFIG.room.wallHeight, KITCHEN_CONFIG.room.depth, cfg.wallSide, 7.1, 2.1, 0);
  scene.add(backWall, leftWall, rightWall);
  // A warm rug down the middle walkway, so the route reads at a glance.
  const rug = box(3.2, 0.02, 8.4, 0x7a2f3d, 0, 0.012, 0);
  rug.castShadow = false;
  scene.add(rug);

  const stations = new Map();
  const pickMeshes = [floor];

  for (const def of STATION_DEFS) {
    const group = new THREE.Group();
    group.position.set(def.x, 0, def.z);
    // Counter body + top, shared by every station so the room reads as one kitchen.
    group.add(box(1.3, 0.9, 2.4, cfg.counter, 0, 0.45, 0));
    group.add(box(1.5, 0.12, 2.6, cfg.counterTop, 0, 0.96, 0));

    if (def.kind === 'pantry') {
      // Four ingredient bins along the pantry counter.
      const keys = Object.keys(INGREDIENTS);
      keys.forEach((key, i) => {
        const z = -0.85 + i * 0.57;
        const bin = box(1.0, 0.35, 0.45, 0x3d2f4a, 0, 1.2, z);
        const food = sphere(0.2, KITCHEN_CONFIG.ingredientColors[key], 0, 1.42, z);
        food.userData.ingredient = key;
        bin.userData.ingredient = key;
        group.add(bin, food);
      });
    }
    if (def.kind === 'firePit') {
      const stones = [];
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        stones.push(sphere(0.16, cfg.firePitStone, Math.cos(a) * 0.5, 1.1, Math.sin(a) * 0.5));
      }
      const fire = new THREE.Mesh(
        new THREE.ConeGeometry(0.34, 0.85, 10),
        new THREE.MeshStandardMaterial({ color: cfg.fireEmber, emissive: 0xff5500, emissiveIntensity: 2.2 }),
      );
      fire.position.set(0, 1.45, 0);
      const fireLight = new THREE.PointLight(0xff7733, 14, 6, 1.6);
      fireLight.position.set(0, 1.8, 0);
      group.add(...stones, fire, fireLight);
      stations.set(def.id, { def, group, fire, fireLight, slot: null, progressBar: makeProgressBar() });
    }
    if (def.kind === 'hearth') {
      const oven = box(1.1, 1.1, 1.6, cfg.hearthBrick, 0, 1.55, 0);
      const mouth = box(0.7, 0.55, 0.2, 0x1a0d08, 0, 1.35, 0.85);
      const glow = new THREE.PointLight(0xffaa33, 10, 5, 1.6);
      glow.position.set(0, 1.6, 1.0);
      const chimney = box(0.5, 1.2, 0.5, cfg.hearthBrick, 0, 2.6, -0.4);
      group.add(oven, mouth, glow, chimney);
      stations.set(def.id, { def, group, fire: null, fireLight: glow, slot: null, progressBar: makeProgressBar() });
    }
    if (def.kind === 'nanoCooker') {
      const body = cylinder(0.55, 0.65, 1.0, cfg.nanoBody, 0, 1.5, 0, 24);
      body.material.metalness = 0.7;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.62, 0.06, 10, 32),
        new THREE.MeshStandardMaterial({ color: cfg.nanoGlow, emissive: 0x00c8ff, emissiveIntensity: 2.0 }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 2.05, 0);
      const holo = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 0.9, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x66eaff, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
      );
      holo.position.set(0, 2.5, 0);
      const glow = new THREE.PointLight(0x33e0ff, 10, 5, 1.6);
      glow.position.set(0, 2.1, 0);
      group.add(body, ring, holo, glow);
      stations.set(def.id, { def, group, fire: holo, fireLight: glow, slot: null, progressBar: makeProgressBar() });
    }
    if (def.kind === 'pantry') {
      stations.set(def.id, { def, group, fire: null, fireLight: null, slot: null, progressBar: makeProgressBar() });
    }
    if (def.kind === 'plate') {
      const plate = cylinder(0.55, 0.5, 0.08, cfg.plate, 0, 1.06, 0, 28);
      group.add(plate);
      stations.set(def.id, { def, group, fire: null, fireLight: null, slot: null, progressBar: makeProgressBar(), plate });
    }
    if (def.kind === 'serve') {
      const bell = sphere(0.22, 0xd9a45b, 0, 1.25, -0.5);
      const bellBase = cylinder(0.28, 0.3, 0.06, 0x8a6a2f, 0, 1.06, -0.5, 20);
      const windowFrame = box(0.15, 1.6, 2.2, 0x2c2140, 0.55, 2.2, 0);
      group.add(bell, bellBase, windowFrame);
      stations.set(def.id, { def, group, fire: null, fireLight: null, slot: null, progressBar: makeProgressBar() });
    }

    const station = stations.get(def.id);
    if (station) {
      station.progressBar.group.position.set(0, 2.9, 0);
      group.add(station.progressBar.group);
    }
    tagStation(group, def.id);
    scene.add(group);
    pickMeshes.push(group);
  }

  // The chef: white hat, coat body, simple face — one readable figure.
  const chef = new THREE.Group();
  const body = cylinder(0.34, 0.42, 0.85, cfg.chefCoat, 0, 0.55, 0);
  const head = sphere(0.3, cfg.chefSkin, 0, 1.28, 0);
  const hatBase = cylinder(0.3, 0.32, 0.22, cfg.chefHat, 0, 1.55, 0, 16);
  const hatTop = sphere(0.32, cfg.chefHat, 0, 1.78, 0);
  hatTop.scale.y = 0.7;
  const held = sphere(0.22, 0xc0392b, 0.45, 1.0, 0.25);
  held.visible = false;
  chef.add(body, head, hatBase, hatTop, held);
  chef.position.set(2.2, 0, 0.6);
  scene.add(chef);

  // Plate items sit on the assembly counter as coloured domes.
  const plateItemsGroup = new THREE.Group();
  plateItemsGroup.position.set(5.6, 1.12, 0.4);
  scene.add(plateItemsGroup);

  return {
    scene, camera, chef, heldMesh: held, stations, plateItemsGroup, pickMeshes,
    ingredientColorOf(item) {
      return KITCHEN_CONFIG.ingredientColors[item]
        ?? (FINISHED_ITEMS[item] ? KITCHEN_CONFIG.ingredientColors[item] : 0xffffff);
    },
  };
}

/** Per-frame life: fire flicker, nano hologram spin, progress bars, slot bobbing. */
export function updateKitchenVisuals(kitchen, timeSeconds) {
  for (const station of kitchen.stations.values()) {
    if (station.fire && station.def.kind === 'firePit') {
      const flicker = 1 + Math.sin(timeSeconds * 9) * 0.12 + Math.sin(timeSeconds * 23) * 0.06;
      station.fire.scale.set(flicker, flicker, flicker);
      if (station.fireLight) station.fireLight.intensity = 13 + Math.sin(timeSeconds * 11) * 3;
    }
    if (station.fire && station.def.kind === 'nanoCooker') {
      station.fire.rotation.y = timeSeconds * 1.4;
      if (station.fireLight) station.fireLight.intensity = 9 + Math.sin(timeSeconds * 5) * 2;
    }
    if (station.slot) {
      const bar = station.progressBar;
      const done = station.slot.progress >= station.slot.total;
      bar.group.visible = true;
      bar.group.lookAt(kitchen.camera.position);
      const frac = Math.min(1, station.slot.progress / station.slot.total);
      bar.fill.scale.x = Math.max(0.001, frac);
      bar.fill.position.x = -0.53 * (1 - frac);
      bar.fill.material.color.setHex(done ? 0xffd76a : 0x7ed957);
      station.slot.mesh.position.y = 1.55 + Math.sin(timeSeconds * 3) * 0.05;
      station.slot.mesh.scale.setScalar(done ? 1.15 : 1);
    } else {
      station.progressBar.group.visible = false;
    }
  }
}

/** Show the finished items stacked on the assembly plate. */
export function refreshPlateVisuals(kitchen, plateItems) {
  while (kitchen.plateItemsGroup.children.length > 0) {
    kitchen.plateItemsGroup.remove(kitchen.plateItemsGroup.children[0]);
  }
  plateItems.forEach((item, i) => {
    const dome = sphere(0.2, kitchen.ingredientColorOf(item), -0.25 + (i % 2) * 0.5, 0.06, -0.2 + Math.floor(i / 2) * 0.4);
    kitchen.plateItemsGroup.add(dome);
  });
}

/** Put a transforming item on a station (or clear it) with a visible mesh. */
export function setStationSlotVisual(kitchen, stationId, item, colorHex) {
  const station = kitchen.stations.get(stationId);
  if (!station) return;
  if (station.slotMesh) {
    station.group.remove(station.slotMesh);
    station.slotMesh = null;
  }
  if (item) {
    const mesh = sphere(0.24, colorHex, 0, 1.55, 0);
    station.group.add(mesh);
    station.slotMesh = mesh;
  }
}

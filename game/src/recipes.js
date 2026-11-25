// Every ingredient and recipe in Chrono Kitchen. A recipe is a list of finished
// items that must land on the plate together; each finished item comes from one
// station transform, so multi-step recipes force a route across the eras.
export const INGREDIENTS = {
  rawMeat: { label: 'Raw Meat', color: '#c0392b', key: '1', station: 'firePit', result: 'grilled', verb: 'Grill' },
  dough: { label: 'Dough', color: '#e8d5a8', key: '2', station: 'hearth', result: 'bread', verb: 'Bake' },
  veg: { label: 'Veg', color: '#3fae5a', key: '3', station: 'nanoCooker', result: 'salad', verb: 'Nano-chop' },
  spice: { label: 'Spice', color: '#8e44ad', key: '4', station: 'nanoCooker', result: 'sauce', verb: 'Nano-infuse' },
};

/** Finished items a station hands back, with the station that made them. */
export const FINISHED_ITEMS = {
  grilled: { label: 'Grilled Meat', color: '#7a3b12', from: 'firePit' },
  bread: { label: 'Hearth Bread', color: '#d9a45b', from: 'hearth' },
  smoked: { label: 'Smoked Meat', color: '#6e2f1d', from: 'hearth' },
  salad: { label: 'Nano Salad', color: '#7ed957', from: 'nanoCooker' },
  sauce: { label: 'Spice Sauce', color: '#e67e22', from: 'nanoCooker' },
};

/** Station transforms: raw ingredient -> finished item (hearth smokes meat too). */
export const STATION_TRANSFORMS = {
  firePit: { rawMeat: 'grilled' },
  hearth: { dough: 'bread', rawMeat: 'smoked' },
  nanoCooker: { veg: 'salad', spice: 'sauce' },
};

export const RECIPES = [
  { id: 'ember-steak', name: 'Ember Steak', needs: ['grilled'], points: 60, deadline: 50,
    route: 'Raw Meat → 🔥 Fire-Pit → Plate' },
  { id: 'hearth-loaf', name: 'Hearth Loaf', needs: ['bread'], points: 60, deadline: 50,
    route: 'Dough → 🏰 Hearth → Plate' },
  { id: 'smoke-spice', name: 'Smoke & Spice', needs: ['smoked', 'sauce'], points: 120, deadline: 60,
    route: 'Meat → 🏰 Hearth · Spice → 🤖 Nano → Plate' },
  { id: 'chrono-burger', name: 'Chrono Burger', needs: ['grilled', 'bread', 'salad'], points: 180, deadline: 65,
    route: 'Meat → 🔥 Fire · Dough → 🏰 Hearth · Veg → 🤖 Nano → Plate' },
  { id: 'time-feast', name: 'Time Feast', needs: ['grilled', 'smoked', 'bread', 'salad'], points: 260, deadline: 75,
    route: 'Meat → 🔥 + 🏰 · Dough → 🏰 · Veg → 🤖 Nano → Plate' },
];

/** Pick a recipe weighted toward short ones early, harder ones as the shift heats up. */
export function pickRecipe(rushLevel) {
  const pool = rushLevel < 1 ? RECIPES.slice(0, 2)
    : rushLevel < 2 ? RECIPES.slice(0, 4) : RECIPES;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** True when the plate holds exactly the recipe's items (order does not matter). */
export function plateMatchesRecipe(plateItems, recipe) {
  if (plateItems.length !== recipe.needs.length) return false;
  const sortedPlate = [...plateItems].sort();
  const sortedNeeds = [...recipe.needs].sort();
  return sortedPlate.every((item, i) => item === sortedNeeds[i]);
}

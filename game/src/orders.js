// The order board: spawns tickets, counts each ticket's deadline down, scores
// serves and tracks the combo streak. Orders get faster and harder as the shift
// rushes on; a ticket that runs out costs a heart and breaks the combo.
import { KITCHEN_CONFIG } from './config.js';
import { pickRecipe, plateMatchesRecipe } from './recipes.js';

export class OrderBoard {
  constructor() {
    this.orders = [];
    this.nextOrderId = 1;
    this.spawnInSeconds = KITCHEN_CONFIG.orderFirstDelaySeconds;
    this.score = 0;
    this.comboStreak = 0;
    this.serves = 0;
    this.expired = 0;
    this.hearts = KITCHEN_CONFIG.maxHearts;
    this.lastEvent = null;
  }

  /** Rush level 0 (calm) to 2 (dinner rush) from how much of the shift is gone. */
  rushLevel(elapsedSeconds) {
    const fraction = elapsedSeconds / KITCHEN_CONFIG.shiftSeconds;
    return fraction < 0.4 ? 0 : fraction < 0.75 ? 1 : 2;
  }

  spawnIntervalSeconds(rush) {
    const span = KITCHEN_CONFIG.orderSpawnMaxSeconds - KITCHEN_CONFIG.orderSpawnMinSeconds;
    return KITCHEN_CONFIG.orderSpawnMaxSeconds - span * (rush / 2);
  }

  /** Combo multiplier: every two clean serves raise it, capped at the config max. */
  comboMultiplier() {
    return 1 + Math.min(
      Math.floor(this.comboStreak / KITCHEN_CONFIG.combo.stepEveryServes),
      KITCHEN_CONFIG.combo.maxMultiplier - 1,
    );
  }

  tick(dtSeconds, elapsedSeconds) {
    const rush = this.rushLevel(elapsedSeconds);
    this.spawnInSeconds -= dtSeconds;
    if (this.spawnInSeconds <= 0 && this.orders.length < KITCHEN_CONFIG.maxOrders) {
      const recipe = pickRecipe(rush);
      this.orders.push({
        id: this.nextOrderId,
        recipe,
        remaining: recipe.deadline,
        total: recipe.deadline,
      });
      this.nextOrderId += 1;
      this.spawnInSeconds = this.spawnIntervalSeconds(rush) * (0.8 + Math.random() * 0.4);
    }
    for (const order of this.orders) order.remaining -= dtSeconds;
    const lost = this.orders.filter((o) => o.remaining <= 0);
    if (lost.length > 0) {
      this.orders = this.orders.filter((o) => o.remaining > 0);
      this.hearts -= lost.length;
      this.expired += lost.length;
      this.comboStreak = 0;
      this.lastEvent = { kind: 'expired', text: `Order expired! −${lost.length} ♥`, at: Date.now() };
    }
  }

  /** Try to serve the plate: the first order it matches exactly pays out. */
  servePlate(plateItems) {
    const match = this.orders.find((o) => plateMatchesRecipe(plateItems, o.recipe));
    if (!match) {
      this.lastEvent = { kind: 'nomatch', text: 'No order wants this plate!', at: Date.now() };
      return null;
    }
    const timeBonus = Math.round(
      KITCHEN_CONFIG.score.timeBonusMax * (match.remaining / match.total),
    );
    const points = (match.recipe.points + timeBonus) * this.comboMultiplier();
    this.score += points;
    this.serves += 1;
    this.comboStreak += 1;
    this.orders = this.orders.filter((o) => o.id !== match.id);
    this.lastEvent = {
      kind: 'served',
      text: `${match.recipe.name} served! +${points}`,
      at: Date.now(),
    };
    return { order: match, points };
  }

  isGameOver() {
    return this.hearts <= 0;
  }

  reset() {
    this.orders = [];
    this.nextOrderId = 1;
    this.spawnInSeconds = KITCHEN_CONFIG.orderFirstDelaySeconds;
    this.score = 0;
    this.comboStreak = 0;
    this.serves = 0;
    this.expired = 0;
    this.hearts = KITCHEN_CONFIG.maxHearts;
    this.lastEvent = null;
  }
}

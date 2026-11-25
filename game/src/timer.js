// The shift countdown: one clock for the whole service, with rush phases the HUD
// and the order board read from the same elapsed time.
import { KITCHEN_CONFIG } from './config.js';

export class ShiftTimer {
  constructor(totalSeconds = KITCHEN_CONFIG.shiftSeconds) {
    this.totalSeconds = totalSeconds;
    this.elapsedSeconds = 0;
    this.running = false;
  }

  start() {
    this.running = true;
  }

  tick(dtSeconds) {
    if (this.running) this.elapsedSeconds += dtSeconds;
  }

  remainingSeconds() {
    return Math.max(0, this.totalSeconds - this.elapsedSeconds);
  }

  isFinished() {
    return this.remainingSeconds() <= 0;
  }

  /** 0 calm, 1 busy, 2 dinner rush — same bands the order board uses. */
  rushLevel() {
    const fraction = this.elapsedSeconds / this.totalSeconds;
    return fraction < 0.4 ? 0 : fraction < 0.75 ? 1 : 2;
  }

  rushLabel() {
    return ['Service calm', 'Lunch rush', 'DINNER RUSH!'][this.rushLevel()];
  }

  /** "2:30" style clock text for the HUD. */
  clockText() {
    const left = Math.ceil(this.remainingSeconds());
    const minutes = Math.floor(left / 60);
    const seconds = String(left % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  reset() {
    this.elapsedSeconds = 0;
    this.running = false;
  }
}

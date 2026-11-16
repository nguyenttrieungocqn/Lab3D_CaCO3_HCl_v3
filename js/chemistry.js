export const MOLAR_MASS = 100.086;

export const MOLAR_VOLUME = 24465.4;

export class Reaction {
  constructor(parameters) {
    this.reset(parameters);
  }
  reset(parameters) {
    this.p = Object.freeze({
      ...parameters
    });
    this.initialCa = this.p.mass / MOLAR_MASS;
    this.initialH = this.p.concentration * this.p.volume;
    this.limit = Math.min(this.initialCa, this.initialH / 2);
    this.extent = 0;
    this.time = 0;
    this.done = false;
    this.history = [ [ 0, 0 ] ];
    this.initialRate = null;
    this.firstSecond = 0;
  }
  rate(x = this.extent) {
    const fraction = Math.max(0, 1 - x / this.initialCa);
    const concentration = Math.max(0, this.initialH - 2 * x) / this.p.volume;
    const arrhenius = Math.exp(35e3 / 8.314462618 * (1 / 298.15 - 1 / (this.p.temperature + 273.15)));
    return .005 * (this.p.mass / 2) * (2 / this.p.diameter) * fraction ** (2 / 3) * concentration * arrhenius;
  }
  advance(seconds) {
    const before = this.extent;
    let left = seconds;
    while (left > 1e-10 && !this.done) {
      const rate = this.rate();
      if (!(rate > 0) || this.limit === 0) {
        this.done = true;
        break;
      }
      const target = .995 * this.limit;
      const h = Math.min(left, .01, this.time < 1 ? 1 - this.time : 1 / 0, (target - this.extent) / rate);
      const x = this.extent;
      const k1 = rate;
      const k2 = this.rate(x + h * k1 / 2);
      const k3 = this.rate(x + h * k2 / 2);
      const k4 = this.rate(x + h * k3);
      const delta = Math.min(h * (k1 + 2 * k2 + 2 * k3 + k4) / 6, this.limit - x);
      this.extent += delta;
      this.time += h;
      left -= h;
      if (this.initialRate === null) {
        this.firstSecond += delta;
        if (this.time >= 1) this.initialRate = this.firstSecond * MOLAR_VOLUME / this.time;
      }
      if (target - this.extent < 1e-12) {
        this.done = true;
        if (this.initialRate === null) this.initialRate = this.firstSecond * MOLAR_VOLUME;
      }
      if (this.time - this.history.at(-1)[0] >= .2 || this.done) this.history.push([ this.time, this.co2 ]);
    }
    return this.extent - before;
  }
  get co2() {
    return this.extent * MOLAR_VOLUME;
  }
  get remainingCa() {
    return Math.max(0, this.initialCa - this.extent);
  }
  get remainingH() {
    return Math.max(0, this.initialH - 2 * this.extent);
  }
  get fraction() {
    return this.remainingCa / this.initialCa;
  }
  get progress() {
    return this.limit ? this.extent / this.limit : 0;
  }
}

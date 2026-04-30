export class CronScheduler {
  constructor(options = {}) {
    this.interval = options.interval || 60_000;
    this.maxRunTime = options.maxRunTime || 30_000;
    this.enabled = options.enabled ?? false;
    this.running = false;
    this.timerId = null;
    this.lastRun = null;
    this.runCount = 0;
    this.executor = null;
    this.onStatusChange = options.onStatusChange || (() => {});
  }

  start() {
    if (this.timerId) return;
    this.enabled = true;
    this.timerId = setInterval(() => this.tick(), this.interval);
    this.onStatusChange(this.getStatus());
  }

  stop() {
    this.enabled = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.onStatusChange(this.getStatus());
  }

  async tick() {
    if (this.running || !this.enabled || !this.executor) return;
    this.running = true;
    this.onStatusChange(this.getStatus());
    try {
      await Promise.race([
        this.executor(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Cron timeout")),
            this.maxRunTime,
          ),
        ),
      ]);
      this.lastRun = Date.now();
      this.runCount++;
    } catch (e) {
      console.warn("[cron] Task execution failed:", e.message);
    } finally {
      this.running = false;
      this.onStatusChange(this.getStatus());
    }
  }

  setCronExecutor(fn) {
    this.executor = fn;
  }

  setInterval(ms) {
    this.interval = ms;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = setInterval(() => this.tick(), this.interval);
    }
    this.onStatusChange(this.getStatus());
  }

  async runNow() {
    if (this.running || !this.executor) return;
    this.running = true;
    this.onStatusChange(this.getStatus());
    try {
      await Promise.race([
        this.executor(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Cron timeout")),
            this.maxRunTime,
          ),
        ),
      ]);
      this.lastRun = Date.now();
      this.runCount++;
    } catch (e) {
      console.warn("[cron] Manual run failed:", e.message);
    } finally {
      this.running = false;
      this.onStatusChange(this.getStatus());
    }
  }

  getStatus() {
    return {
      enabled: this.enabled,
      running: this.running,
      lastRun: this.lastRun,
      runCount: this.runCount,
      interval: this.interval,
    };
  }
}

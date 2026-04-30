/**
 * Manages multiple isolated Moodle Playground instances.
 * Each instance has its own scope, runtime, and state.
 */
export class InstanceManager {
  #instances;
  #activeScope;
  #onChange;

  constructor({ onChange } = {}) {
    this.#instances = new Map();
    this.#activeScope = null;
    this.#onChange = onChange || (() => {});
    this.#loadFromStorage();
  }

  get activeScope() {
    return this.#activeScope;
  }

  get instances() {
    return [...this.#instances.entries()].map(([id, meta]) => ({
      id,
      ...meta,
    }));
  }

  createInstance(options = {}) {
    const id = crypto.randomUUID().slice(0, 8);
    const meta = {
      label: options.label || `Instance ${this.#instances.size + 1}`,
      moodleVersion: options.moodleVersion || "5.0",
      phpVersion: options.phpVersion || "8.3",
      createdAt: Date.now(),
      blueprint: options.blueprint || null,
    };
    this.#instances.set(id, meta);
    this.#persist();
    this.#onChange();
    return id;
  }

  switchInstance(id) {
    if (!this.#instances.has(id)) {
      throw new Error(`Instance ${id} not found`);
    }
    this.#activeScope = id;
    this.#persist();
    this.#onChange();
    return this.#instances.get(id);
  }

  deleteInstance(id) {
    if (!this.#instances.has(id)) return false;
    this.#instances.delete(id);
    if (this.#activeScope === id) {
      this.#activeScope = this.#instances.keys().next().value || null;
    }
    this.#persist();
    this.#onChange();
    return true;
  }

  getInstanceMeta(id) {
    return this.#instances.get(id) || null;
  }

  #persist() {
    try {
      const data = {
        instances: Object.fromEntries(this.#instances),
        activeScope: this.#activeScope,
      };
      sessionStorage.setItem(
        "moodle-playground:instances",
        JSON.stringify(data),
      );
    } catch {
      // Storage unavailable
    }
  }

  #loadFromStorage() {
    try {
      const raw = sessionStorage.getItem("moodle-playground:instances");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.instances) {
        for (const [id, meta] of Object.entries(data.instances)) {
          this.#instances.set(id, meta);
        }
      }
      this.#activeScope = data.activeScope || null;
    } catch {
      // Corrupt or unavailable
    }
  }
}

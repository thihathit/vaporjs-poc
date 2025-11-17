import { equalFn } from "../utilities";

let CURRENT_EFFECT: Effect | null = null;

class Effect {
  fn: VoidFunction;
  deps: Set<Effect>[] = [];
  disposed = false;
  running = false;

  constructor(fn: VoidFunction) {
    this.fn = fn;

    // run once immediately
    this.run();
  }

  // Mark this effect as the current observer so any signal reads during fn()
  // can register this effect as a subscriber.
  //
  // This relies on synchronous execution: fn() runs immediately on the current
  // call stack (JavaScript is single-threaded), so registration happens
  // synchronously while fn() is executing. Because registration is synchronous
  // and happens in call-order, subscribers are added in the order reads occur
  // (effectively FIFO with respect to those synchronous reads). There is no
  // concurrent/parallel effect registration here — two effects cannot be the
  // CURRENT_EFFECT at the same time.
  //
  // The try/finally ensures CURRENT_EFFECT is cleared even if fn throws.
  // Note: if you need to support nested effects (an effect that itself runs
  // another effect), this single global CURRENT_EFFECT would be insufficient;
  // you'd use a stack of observers instead.
  run = () => {
    if (this.disposed) return;

    // prevent self-recursion
    if (this.running) return;

    this.running = true;

    const oldDeps = this.deps;
    this.deps = [];

    CURRENT_EFFECT = this;

    try {
      this.fn();
    } finally {
      CURRENT_EFFECT = null;

      // remove stale deps
      for (const dep of oldDeps) {
        if (!this.deps.includes(dep)) dep.delete(this);
      }

      this.running = false;
    }
  };

  dispose = () => {
    if (this.disposed) return;
    this.disposed = true;

    // remove from all deps
    for (const dep of this.deps) dep.delete(this);
    this.deps.length = 0;
  };
}

export type Signal<T> = ReturnType<typeof createSignal<T>>;

export type Accessor<T> = Signal<T>[0];

export const createSignal = <T>(initialValue: T, isEqual = equalFn) => {
  let value = initialValue;

  const subscribers: Set<Effect> = new Set();

  const accessor = (): T => {
    if (CURRENT_EFFECT) {
      // Always renew dependencies per run:
      const effect = CURRENT_EFFECT;

      subscribers.add(effect);
      effect.deps.push(subscribers);
    }
    return value;
  };

  const write = (newValue: T | ((currentValue: T) => T)): void => {
    const nextValue = newValue instanceof Function ? newValue(value) : newValue;

    // Equality check to avoid needless re-scheduling
    if (isEqual(nextValue, value)) return;

    value = nextValue;

    // trigger effects in stable order
    for (const eff of subscribers) eff.run();
  };

  return [accessor, write] as const;
};

export const createEffect = (fn: VoidFunction) => {
  const { dispose } = new Effect(fn);

  return dispose;
};

export const createMemo = <T>(fn: () => T, isEqual = equalFn): Accessor<T> => {
  let value: T | undefined;

  const subscribers = new Set<Effect>();

  // Wrap memo computation in its own effect
  new Effect(() => {
    const next = fn();
    const changed = !isEqual(next, value);

    if (!changed) return;

    value = next;

    // Notify dependents of the memo
    for (const eff of subscribers) eff.run();
  });

  const accessor = () => {
    if (CURRENT_EFFECT) {
      subscribers.add(CURRENT_EFFECT);
      CURRENT_EFFECT.deps.push(subscribers);
    }
    return value as T;
  };

  return accessor;
};

export const isMaybeAccessor = <T>(value: unknown): value is Accessor<T> => {
  return typeof value === "function";
};

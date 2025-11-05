import { isFunction } from "../utilities";

const signalIdentity = Symbol("Signal");

export type Signal<T> = (() => T) & {
  [signalIdentity]: true;
  subscribe: (fn: (newValue: T, oldValue: T) => void) => () => void;
};

// Effect tracking system
type EffectRunner = () => void;
let currentEffect: EffectRunner | null = null;
const effectToSignals = new WeakMap<EffectRunner, Set<Signal<any>>>();

export const createSignal = <T>(
  initial: T,
): [Signal<T>, (value: T | ((prev: T) => T)) => T] => {
  let value = initial;

  type Subscriber = (newValue: T, oldValue: T) => void;
  type Setter = T | ((current: T) => T);

  const subs = new Set<Subscriber>();
  const effects = new Set<EffectRunner>();

  const signal = (() => {
    // Track signal access in current effect or createMemo
    if (currentEffect) {
      if (!effects.has(currentEffect)) {
        effects.add(currentEffect);
      }
      const signalSet =
        effectToSignals.get(currentEffect) || new Set<Signal<any>>();
      signalSet.add(signal);
      effectToSignals.set(currentEffect, signalSet);
    }
    return value;
  }) as Signal<T>;

  // Attach signal identity
  signal[signalIdentity] = true;

  // Attach subscribe method
  signal.subscribe = (fn: Subscriber) => {
    subs.add(fn);
    return () => subs.delete(fn);
  };

  const set = (setter: Setter) => {
    const oldValue = value;
    const newValue = isFunction(setter) ? setter(value) : setter;

    if (oldValue === newValue) return newValue;

    value = newValue;

    // Notify subscribers
    for (const sub of subs) sub(newValue, oldValue);

    // Notify effects
    for (const effect of effects) {
      effect();
    }

    return newValue;
  };

  return [signal, set] as const;
};

export type CreateEffect = () => void | (() => void);

export const createEffect = (fn: CreateEffect): (() => void) => {
  let cleanup: (() => void) | undefined;
  let isDisposed = false;
  let previousSignals: Set<Signal<any>> = new Set();

  const runEffect = () => {
    if (isDisposed) return;

    // Cleanup previous effect
    if (cleanup) {
      cleanup();
      cleanup = undefined;
    }

    // Clear previous dependencies from signals
    previousSignals.clear();

    // Track dependencies
    const prevEffect = currentEffect;
    currentEffect = runEffect;

    try {
      const result = fn();
      if (typeof result === "function") {
        cleanup = result;
      }
    } finally {
      currentEffect = prevEffect;

      // Store the signals that were accessed during this run for disposal
      const accessedSignals = effectToSignals.get(runEffect);
      if (accessedSignals) {
        previousSignals = new Set(accessedSignals);
        // Clear the map for next run (dependencies will be re-tracked)
        accessedSignals.clear();
      }
    }
  };

  // Initial run
  runEffect();

  // Return dispose function
  return () => {
    isDisposed = true;
    if (cleanup) {
      cleanup();
      cleanup = undefined;
    }
    previousSignals.clear();
    effectToSignals.delete(runEffect);
  };
};

export const createMemo = <T>(fn: () => T): Signal<T> => {
  let value: T;
  let isStale = true;
  let unsubscribeFns: (() => void)[] = [];

  const subs = new Set<(newValue: T, oldValue: T) => void>();
  const effects = new Set<EffectRunner>();

  const markStale = () => {
    if (!isStale) {
      isStale = true;
      // Don't notify effects here - they will be notified when the memo
      // is accessed and recomputes, and only if the value actually changes
    }
  };

  const signal = (() => {
    // If this createMemo is being accessed in an effect/createMemo, track dependencies
    if (currentEffect) {
      if (!effects.has(currentEffect)) {
        effects.add(currentEffect);
      }
      const signalSet =
        effectToSignals.get(currentEffect) || new Set<Signal<any>>();
      signalSet.add(signal);
      effectToSignals.set(currentEffect, signalSet);
    }

    // Recompute if stale
    if (isStale) {
      // Unsubscribe from old dependencies
      for (const unsubscribe of unsubscribeFns) {
        unsubscribe();
      }
      unsubscribeFns = [];

      // Track dependencies during computation
      const prevEffect = currentEffect;
      currentEffect = signal;

      try {
        const newValue = fn();

        // Store dependencies that were accessed
        const accessedSignals = effectToSignals.get(signal);
        if (accessedSignals) {
          // Subscribe to dependencies
          for (const dep of accessedSignals) {
            const unsubscribe = dep.subscribe(() => {
              markStale();
            });
            unsubscribeFns.push(unsubscribe);
          }
          accessedSignals.clear();
        }

        // Only notify if value actually changed
        const oldValue = value;
        value = newValue;
        isStale = false;

        if (oldValue !== value) {
          // Notify subscribers
          for (const sub of subs) sub(newValue, oldValue);

          // Notify effects
          for (const effect of effects) {
            effect();
          }
        }
      } finally {
        currentEffect = prevEffect;
      }
    }

    return value;
  }) as Signal<T>;

  // Attach signal identity
  signal[signalIdentity] = true;

  // Attach subscribe method
  signal.subscribe = (fn: (newValue: T, oldValue: T) => void) => {
    subs.add(fn);
    return () => subs.delete(fn);
  };

  // Initial computation to set value and track dependencies
  const prevEffect = currentEffect;
  currentEffect = signal;
  try {
    value = fn();
    isStale = false;

    // Track initial dependencies
    const accessedSignals = effectToSignals.get(signal);
    if (accessedSignals) {
      // Subscribe to dependencies
      for (const dep of accessedSignals) {
        const unsubscribe = dep.subscribe(() => {
          markStale();
        });
        unsubscribeFns.push(unsubscribe);
      }
      accessedSignals.clear();
    }
  } finally {
    currentEffect = prevEffect;
  }

  return signal;
};

export const createIndex = <T>(
  parent: Signal<T[]>,
  index: number,
): Signal<T> => {
  // Subscribers and effects local to this derived index-signal
  const subs = new Set<(newVal: T, oldVal: T) => void>();
  const effects = new Set<EffectRunner>();

  const signal = (() => {
    // Track access to this derived signal in the current effect (so effects can depend on it)
    if (currentEffect) {
      if (!effects.has(currentEffect)) {
        effects.add(currentEffect);
      }
      const signalSet =
        effectToSignals.get(currentEffect) || new Set<Signal<any>>();
      signalSet.add(signal as any);
      effectToSignals.set(currentEffect, signalSet);
    }

    const arr = parent();
    return arr ? arr[index] : undefined;
  }) as Signal<T>;

  // identity
  signal[signalIdentity] = true;

  // subscribe: forward parent changes but filter by index
  signal.subscribe = (fn: (newVal: T, oldVal: T) => void) => {
    subs.add(fn);
    return () => subs.delete(fn);
  };

  // Listen to parent and notify index subscribers/effects when this index changes
  const parentUnsub = parent.subscribe(
    (newArr: T[] | undefined, oldArr: T[] | undefined) => {
      const newV = newArr ? newArr[index] : undefined;
      const oldV = oldArr ? oldArr[index] : undefined;
      if (newV === oldV) return;
      for (const s of subs) s(newV as T, oldV as T);
      for (const e of effects) e();
    },
  );

  // Note: no explicit cleanup/unsubscribe of parentUnsub here (could be added if needed)

  return signal;
};

export const isSignal = <T>(value: any): value is Signal<T> => {
  return typeof value === "function" && value[signalIdentity] === true;
};

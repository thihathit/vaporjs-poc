import { isFunction } from "../utilities";

const signalIdentity = Symbol("Signal");

export type Signal<T> = ((() => T) & {
  [signalIdentity]: true;
  subscribe: (fn: (newValue: T, oldValue: T) => void) => () => void;
});

export const createAtom = <T>(initial: T): [Signal<T>, (value: T | ((prev: T) => T)) => T] => {
  let value = initial;

  type Subscriber = (newValue: T, oldValue: T) => void;
  type Setter = T | ((current: T) => T);

  const subs = new Set<Subscriber>();

  const signal = (() => value) as Signal<T>;
  
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

    for (const sub of subs) sub(newValue, oldValue);

    return newValue;
  };

  return [signal, set] as const;
};

export const isSignal = <T>(value: any): value is Signal<T> => {
  return typeof value === "function" && value[signalIdentity] === true;
};

// Legacy support - keep for backward compatibility during migration
export type Atom<T> = Signal<T>;
export const isAtom = isSignal;
export const toValue = <T>(signal: Signal<T>): T => signal();

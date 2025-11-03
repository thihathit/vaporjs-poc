import { isFunction } from "../utilities";

const atomIdentity = Symbol("Atom");

export const createAtom = <T>(initial: T) => {
  let value = initial;

  type Subscriber = (newValue: T, oldValue: T) => void;
  type Setter<S = T> = S | ((current: S) => S);

  const subs = new Set<Subscriber>();

  const get = () => value;
  const set = (setter: Setter) => {
    const oldValue = value;
    const newValue = isFunction(setter) ? setter(value) : setter;

    value = newValue;

    for (const sub of subs) sub(newValue, oldValue);

    return newValue;
  };

  const subscribe = (fn: Subscriber) => {
    subs.add(fn);
    return () => subs.delete(fn);
  };

  const atom = { get, set, atomIdentity, subscribe };

  return [atom, set] as const;
};

export type Atomic<T> = ReturnType<typeof createAtom<T>>;

export type Atom<T> = Atomic<T>[0];

export const isAtom = <T>(value: any): value is Atom<T> => {
  if (!value) return false;

  return value?.atomIdentity == atomIdentity;
};

export const toValue = <T>({ get }: Atom<T>): T => get();

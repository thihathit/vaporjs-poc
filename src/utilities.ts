export const useWorker = (
  script: string | (() => void),
  onMessage?: (data: any) => void,
) => {
  const code =
    typeof script === "function" ? `(${script.toString()})()` : String(script);

  const blob = new Blob([code], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);

  const messageHandler = (e: MessageEvent) => {
    onMessage?.(e.data);
  };
  worker.addEventListener("message", messageHandler);

  const unloadHandler = () => {
    try {
      worker.removeEventListener("message", messageHandler);
      worker.terminate();
    } finally {
      // always revoke the object URL and remove the unload listener
      URL.revokeObjectURL(url);
      window.removeEventListener("beforeunload", unloadHandler);
    }
  };

  window.addEventListener("beforeunload", unloadHandler);

  return {
    worker,
    post: (msg: any) => worker.postMessage(msg),
    terminate: unloadHandler,
  };
};

export const isFunction = (v: unknown): v is Function => {
  return typeof v === "function";
};

export const equalFn = <T>(a: T, b: T) => a === b;

export const deepEqual: typeof equalFn = (
  a,
  b,
  seen = new WeakMap<object, object>(),
) => {
  if (Object.is(a, b)) return true;

  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  ) {
    return false;
  }

  // handle circular references
  if (seen.get(a) === b) return true;
  seen.set(a, b);

  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();
  if (a instanceof RegExp && b instanceof RegExp)
    return a.toString() === b.toString();

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i], seen)) return false;
    }
    return true;
  }

  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [k, v] of a) {
      if (!b.has(k) || !deepEqual(v, b.get(k), seen)) return false;
    }
    return true;
  }

  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const v of a) {
      let found = false;
      for (const bv of b) {
        if (deepEqual(v, bv, seen)) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key], seen)) return false;
  }
  return true;
};

export const shallowEqual: typeof equalFn = (a, b) => {
  if (Object.is(a, b)) return true;

  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  ) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!Object.is(a[key], b[key])) return false;
  }
  return true;
};

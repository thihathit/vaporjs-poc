import { type Signal, isSignal, createIndex } from "../signal";
const indexCache = new WeakMap<Signal<any>, Signal<any>[]>();

export type Hole = {
  node: Node;
  prop?: string;
  getter: () => Signal<any>;
};

export type RenderResult = {
  fragment: DocumentFragment;
  holes: Hole[];
};

/**
 * Fragment component - renders children into a DocumentFragment and returns
 * the fragment along with holes collected while normalizing children.
 */
export function Fragment(props: any): RenderResult {
  const fragment = document.createDocumentFragment();
  const holes: Hole[] = [];
  const children = normalizeChildren(props?.children, holes);
  for (const c of children) fragment.append(c);
  return { fragment, holes };
}

/**
 * Index component - Solid-style indexed renderer.
 *
 * Usage:
 *  <Index each={someSignalOrArray}>
 *    {(itemSignalOrValue, index) => <p>{itemSignalOrValue}</p>}
 *  </Index>
 *
 * If `each` is a Signal (function with signal identity) Index will derive
 * per-index signals using `createIndex` and expose them to the child factory.
 * If `each` is a plain array, Index will pass the raw value to the child.
 *
 * Index returns a RenderResult so it can be consumed by the JSX runtime as a component.
 */
export function Index<T>(props: {
  each: Signal<T[]> | T[];
  children: (item: T, index: number) => RenderResult;
}): RenderResult {
  const fragment = document.createDocumentFragment();
  const holes: Hole[] = [];

  const each = props?.each;
  const factory = Array.isArray(props?.children)
    ? // if there are multiple children, we assume the first is the factory
      props.children[0]
    : props.children;

  const isFactoryFn = typeof factory === "function";

  // Resolve the array (signal or raw)
  const arr = isSignal(each) ? (each() as any[]) : each || ([] as any[]);

  // If `each` is a signal, try to reuse cached per-index signals
  const indexSigs: Signal<any>[] = [];
  if (isSignal(each)) {
    let cached = indexCache.get(each as Signal<any>);
    if (!cached || cached.length !== arr.length) {
      cached = new Array(arr.length);
      for (let i = 0; i < arr.length; i++) {
        cached[i] = createIndex(each as Signal<any[]>, i);
      }
      indexCache.set(each as Signal<any>, cached);
    }
    for (let i = 0; i < arr.length; i++) indexSigs.push(cached[i]);
  }

  // For each item, call the factory to obtain child nodes and normalize them
  for (let i = 0; i < arr.length; i++) {
    const itemSignalOrValue = isSignal(each) ? indexSigs[i] : arr[i];
    let result;
    if (isFactoryFn) {
      // factory may be (item, index) => JSX
      result = factory(itemSignalOrValue, i);
    } else {
      // If no factory provided, treat each element as JSX content
      result = itemSignalOrValue;
    }

    const nodes = normalizeChildren(result, holes);
    for (const n of nodes) fragment.append(n);
  }

  return { fragment, holes };
}

export function jsx(tag: any, props: any, ...children: any[]): RenderResult {
  const fragment = document.createDocumentFragment();
  const holes: Hole[] = [];

  // Merge children from props and arguments
  const allChildren = children.length > 0 ? children : props?.children;

  // Support function components and Fragment component
  if (typeof tag === "function") {
    return tag({ ...(props || {}), children: allChildren });
  }

  const el = document.createElement(tag);

  // Handle props
  for (const [name, value] of Object.entries(props || {})) {
    if (name === "children") continue;

    if (name.startsWith("on") && typeof value === "function") {
      // @ts-ignore
      el.addEventListener(name.slice(2).toLowerCase(), value);
      continue;
    }

    // Check if value is a signal or memo (function with signal identity)
    // Memos are signals, so they're automatically tracked here
    if (isSignal(value)) {
      holes.push({
        node: el,
        prop: name,
        getter: () => value,
      });

      // Access the signal/memo to get current value and trigger dependency tracking
      const nodeValue = String(value());
      el.setAttribute(name, nodeValue);
    } else {
      el.setAttribute(name, String(value));
    }
  }

  // Handle children
  const normalizedChildren = normalizeChildren(allChildren, holes);
  for (const c of normalizedChildren) el.append(c);

  fragment.append(el);
  return { fragment, holes };
}

export const jsxs = jsx;
export const jsxDEV = jsx;

function normalizeChildren(children: any, holes: Hole[]): Node[] {
  if (children == null) return [];
  const arr = Array.isArray(children) ? children : [children];
  const out: Node[] = [];

  for (const child of arr) {
    if (child == null || child === false) continue;

    // Flatten arrays of children (e.g., from list.map(...))
    if (Array.isArray(child)) {
      const nested = normalizeChildren(child, holes);

      // Append nested children to the output array
      for (const n of nested) out.push(n);

      // End current iteration
      continue;
    }

    // Check if child is a signal or memo (function with signal identity)
    // Memos are signals, so they're automatically tracked here
    if (isSignal(child)) {
      // If the signal returns an array, map each index to a reusable index-signal
      // using `createIndex` and a cache. This avoids wrapping reactivity inside
      // the memo itself and mirrors Solid's runtime approach (index-level signals
      // exposed to the DOM runtime).
      const val = child();

      if (Array.isArray(val)) {
        // Try reuse cached per-index signals for this parent signal
        let cached = indexCache.get(child as Signal<any>);
        if (!cached || cached.length !== val.length) {
          cached = new Array(val.length);
          for (let i = 0; i < val.length; i++) {
            cached[i] = createIndex(child as Signal<any[]>, i);
          }
          indexCache.set(child as Signal<any>, cached);
        }

        for (let i = 0; i < val.length; i++) {
          const node = document.createTextNode(String(val[i]));

          // The getter returns the cached per-index signal. The flusher will
          // subscribe to that signal and receive per-index updates only.
          holes.push({
            node,
            getter: () => cached![i],
          });

          out.push(node);
        }
      } else {
        // Non-array signal: behave as before
        const nodeValue = String(val);
        const node = document.createTextNode(nodeValue);

        holes.push({
          node,
          getter: () => child,
        });

        out.push(node);
      }
    }
    // is Fragment
    else if (typeof child === "object" && "fragment" in child) {
      out.push(child.fragment);
      holes.push(...child.holes);
    } else {
      out.push(document.createTextNode(String(child)));
    }
  }

  return out;
}

import {
  createEffect,
  createMemo,
  isMaybeAccessor,
  type Accessor,
} from "../signal";

export type Hole = {
  node: Node;
  prop?: string;
  getter: <T>() => Accessor<T>;
};

export type RenderResult = {
  fragment: DocumentFragment;
  holes: Hole[];
};

export function Fragment(props: any): RenderResult {
  const fragment = document.createDocumentFragment();
  const holes: Hole[] = [];
  const children = normalizeChildren(props?.children, holes);
  for (const c of children) fragment.append(c);
  return { fragment, holes };
}

// TODO: Fix it later
export function Index<T>(props: {
  each: Accessor<T[]>;
  children: (item: Accessor<T>, index: number) => RenderResult;
}): RenderResult {
  const fragment = document.createDocumentFragment();
  const holes: Hole[] = [];

  // if there are multiple children, we assume the first is the factory
  const factory = Array.isArray(props.children)
    ? props.children[0]
    : props.children;

  const isFactoryFn = typeof factory === "function";

  if (isFactoryFn) {
    const list = props.each;

    const listFragment = document.createComment("list");
    fragment.append(listFragment);

    // Track per-item metadata so we can mutate the DOM minimally
    const itemEntries: { nodes: Node[]; holesCount: number }[] = [];

    createEffect(() => {
      const arr = list();
      const prevCount = itemEntries.length;
      const nextCount = arr.length;

      // Add new items (append only)
      if (nextCount > prevCount) {
        for (let i = prevCount; i < nextCount; i++) {
          // Each item's getters reference the list by index so they stay correct
          const itemGetter = createMemo(() => list()[i]);

          const beforeHoles = holes.length;
          const nodes = normalizeChildren(factory(itemGetter, i), holes);
          const addedHoles = holes.length - beforeHoles;

          // Insert after the sentinel comment; append subsequent items after the last inserted
          listFragment.before(...nodes);

          itemEntries.push({ nodes, holesCount: addedHoles });
        }
      }

      // Remove excess items (remove from DOM and remove their holes from the shared holes array)
      if (nextCount < prevCount) {
        // Sum how many holes we will remove from the end
        let totalHolesToRemove = 0;
        for (let i = nextCount; i < prevCount; i++) {
          totalHolesToRemove += itemEntries[i].holesCount;
        }

        // Remove DOM nodes for the tail entries
        for (let i = nextCount; i < prevCount; i++) {
          const entry = itemEntries[i];
          for (const node of entry.nodes) {
            node.remove();
          }
        }

        // Remove holes from the end of the holes array (we always append holes for new items)
        if (totalHolesToRemove > 0) {
          holes.splice(holes.length - totalHolesToRemove, totalHolesToRemove);
        }

        // Truncate the entries list
        itemEntries.splice(nextCount);
      }

      // If lengths are equal, we don't touch DOM structure. The individual item accessors
      // (created when the item was first added) reference `list()[i]`, so their values
      // will update and be flushed by the flusher without needing to re-create nodes.
    });
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

  // Bind props
  for (const [name, value] of Object.entries(props || {})) {
    if (name === "children") continue;

    // Bind event listeners
    if (name.startsWith("on") && typeof value === "function") {
      // @ts-ignore
      el.addEventListener(name.slice(2).toLowerCase(), value);
      continue;
    }

    if (isMaybeAccessor(value)) {
      const maybeAccessor = value as Accessor<any>;

      holes.push({
        node: el,
        prop: name,
        getter: () => maybeAccessor,
      });

      const staticValue = maybeAccessor();

      el.setAttribute(name, String(staticValue));
    } else {
      el.setAttribute(name, String(value));
    }
  }

  // Process children
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

    if (isMaybeAccessor(child)) {
      const maybeAccessor = child as Accessor<any>;
      const staticValue = maybeAccessor();

      const text = document.createTextNode(String(staticValue));

      holes.push({
        node: text,
        getter: () => maybeAccessor,
      });

      out.push(text);
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

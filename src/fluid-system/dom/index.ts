import { isMaybeAccessor, type Accessor } from "../signal";

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

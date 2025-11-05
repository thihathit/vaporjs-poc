import { toValue, type Atom, isAtom } from "../atom";

export type Hole = {
  node: Node;
  prop?: string;
  getter: () => Atom<any>;
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

  // Handle props
  for (const [name, value] of Object.entries(props || {})) {
    if (name === "children") continue;

    if (name.startsWith("on") && typeof value === "function") {
      // @ts-ignore
      el.addEventListener(name.slice(2).toLowerCase(), value);
      continue;
    }

    if (isAtom(value)) {
      const atom = value as Atom<any>;
      holes.push({
        node: el,
        prop: name,
        getter: () => atom,
      });
      el.setAttribute(name, String(toValue(atom)));
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

    if (isAtom(child)) {
      const atom = child as Atom<any>;

      const text = document.createTextNode(String(toValue(atom)));
      holes.push({
        node: text,
        getter: () => atom,
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

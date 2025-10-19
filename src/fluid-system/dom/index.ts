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

export const Fragment = Symbol("Fragment");

export function jsx(tag: string, props: any, key?: string): RenderResult {
  const fragment = document.createDocumentFragment();
  const holes: Hole[] = [];

  // Handle fragment
  // @ts-ignore
  if (tag === Fragment) {
    const children = normalizeChildren(props?.children, holes);
    for (const c of children) fragment.append(c);
    return { fragment, holes };
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
  const children = normalizeChildren(props?.children, holes);
  for (const c of children) el.append(c);

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

    if (isAtom(child)) {
      const atom = child as Atom<any>;

      const text = document.createTextNode(String(toValue(atom)));
      holes.push({
        node: text,
        getter: () => atom,
      });
      out.push(text);
    } else if (typeof child === "object" && "fragment" in child) {
      out.push(child.fragment);
      holes.push(...child.holes);
    } else {
      out.push(document.createTextNode(String(child)));
    }
  }

  return out;
}

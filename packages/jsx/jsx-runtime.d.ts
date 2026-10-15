/**
 * The JSX types for a document, so that `jsxImportSource: "@visotalk/jsx"` needs no React: a document is read, never run, so an element is
 * only a type (`null`) and the tags of this package are the only things it can contain.
 */
export namespace JSX {
  type Element = null;
  interface ElementChildrenAttribute {
    children: unknown;
  }
  interface IntrinsicAttributes {}
  interface IntrinsicElements {}
}
export function jsx(type: unknown, props: unknown): null;
export function jsxs(type: unknown, props: unknown): null;
export const Fragment: unique symbol;

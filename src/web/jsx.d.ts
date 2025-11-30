import { RenderResult } from './index';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    
    interface Element extends RenderResult {}
    
    interface ElementChildrenAttribute {
      children: {};
    }
  }
}

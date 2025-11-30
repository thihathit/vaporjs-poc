import type { Hole } from ".";
import { createEffect } from "../signal";

export const connectHoles = (holes: Hole[]) => {
  const dirtyHoles = new Set<Hole>();
  let connections: VoidFunction[] = [];

  // Subscribe all holes but don’t update immediately
  for (const hole of holes) {
    const maybeAccessor = hole.getter();
    const sub = createEffect(() => {
      // Subscribe to the hole's value changes
      maybeAccessor();

      if (!dirtyHoles.has(hole)) {
        dirtyHoles.add(hole);
      }
    });
    connections.push(sub);
  }

  // Manual flush: only apply dirty ones
  const flush = () => {
    if (dirtyHoles.size === 0) return;

    for (const hole of dirtyHoles) {
      const maybeAccessor = hole.getter();
      const val = maybeAccessor();

      if (hole.prop) {
        (hole.node as Element).setAttribute(hole.prop, String(val));
      } else {
        hole.node.textContent = String(val);
      }

      // Clear the dirty flag after updating
      dirtyHoles.delete(hole);
    }
  };

  const disconnect = () => {
    for (const sub of connections) {
      sub();
    }
    connections = [];
  };

  let syncFrameId: number | undefined;
  const syncFrame = () => {
    flush();
    syncFrameId = requestAnimationFrame(syncFrame);

    return () => {
      if (syncFrameId) {
        cancelAnimationFrame(syncFrameId);
      }
    };
  };

  return { flush, syncFrame, disconnect };
};

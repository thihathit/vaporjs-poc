import type { Hole } from "./dom";

export const connectHoles = (holes: Hole[]) => {
  const dirtyHoles = new Set<Hole>();

  // Subscribe all holes but don't update immediately
  const connections = holes.map((hole) => {
    const signal = hole.getter();
    return signal.subscribe(() => {
      if (dirtyHoles.has(hole)) return;

      dirtyHoles.add(hole);
    });
  });

  // Manual flush: only apply dirty ones
  const flush = () => {
    if (dirtyHoles.size === 0) return;

    for (const hole of dirtyHoles) {
      const signal = hole.getter();
      const value = String(signal());

      if (hole.prop) {
        (hole.node as Element).setAttribute(hole.prop, value);
      } else {
        hole.node.textContent = value;
      }

      // Clear the dirty flag after updating
      dirtyHoles.delete(hole);
    }
  };

  const disconnect = () => {
    for (const sub of connections) {
      sub();
      connections.splice(connections.indexOf(sub), 1);
    }
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

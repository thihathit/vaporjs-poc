# 🎮 VaporJS - POC

> A game-engine inspired reactive UI framework using **FrameSync** — a novel rendering technique that decouples state mutations from rendering, synchronizing DOM updates with your display's refresh rate.

## What is FrameSync?

**FrameSync** is a rendering paradigm inspired by game engines where state mutations happen instantly, but rendering is synchronized to the display's refresh rate via `requestAnimationFrame`.

Traditional frameworks couple state changes to rendering. VaporJS separates them completely.

```javascript
// Traditional frameworks (React, Vue, Svelte):
setState(1);  // Triggers render pipeline
setState(2);  // Triggers render pipeline again
setState(3);  // Triggers render pipeline again
// Result: Multiple render cycles, even within a single frame

// VaporJS with FrameSync:
setCount(1);  // Updates atom instantly (synchronous)
setCount(2);  // Updates atom instantly (synchronous)
setCount(3);  // Updates atom instantly (synchronous)
// Result: One render on next frame with final value (count = 3)
```

**Why this matters:**
- Your display refreshes at 60/120/144Hz
- You can't see updates faster than your refresh rate
- Why render multiple times when the display only shows once per frame?

## Key Features

### ⚡ **Instant State Updates**
Atom mutations are synchronous. No batching delays, no microtasks, no promises.

```javascript
const [count, setCount] = createAtom(0);

setCount(5); // Updates immediately
console.log(count()); // 5 - instantly readable
```

### 🖼️ **Frame-Synced Rendering**
Asynchronous DOM updates happen once per display frame via `requestAnimationFrame`, perfectly aligned with your monitor's refresh rate.

### 🎯 **Fine-Grained Reactivity**
Like Solid.js, VaporJS tracks reactive dependencies and updates only affected DOM nodes. No virtual DOM, no diffing.

```jsx
const [count, setCount] = createAtom(0);

// Only the text node updates when count changes
<div>
  <p>Count: {count}</p>  {/* Reactive */}
  <p>Static text</p>       {/* Never re-evaluated */}
</div>
```

### 🔥 **JSX with Manual Binding**
VaporJS uses JSX for ergonomics but extracts reactive "holes" at runtime, binding them directly to DOM nodes without a compiler (compiler optimization possible in the future).

### 🔋 **Automatic Background Optimization**
When your tab goes to the background, `requestAnimationFrame` pauses automatically. Saving CPU and battery.

### 🎨 **Zero Wasted Renders**
No matter how many atom updates happen in a frame, only one render occurs. Perfectly synced to display refresh.

## Quick Start

Clone the repo. Navigate to `src/main.tsx`.

```tsx
import { createAtom } from "./atom";
import { jsx } from "./fluid-system/dom";
import { connectHoles } from "./fluid-system/flusher";

const [count, setCount] = createAtom(0);

const App = () => (
  <div>
    <p>Count: {count()}</p>
    <button onClick={() => setCount(prev => prev + 1)}>
      Increment
    </button>
  </div>
);

const tree = App();
const { syncFrame } = connectHoles(tree.holes);

// Start the FrameSync render loop
syncFrame();

// Mount to DOM
document.querySelector("#app")!.append(tree.fragment);
```

That's it! VaporJS handles the rest.

## Core Concepts

### 1. **Atoms** (Reactive State)

Atoms are VaporJS's reactive primitives. Similar to Solid.js signals.

> [!WARNING]
> The current atom implementation will be replaced with a more efficient system to provide finer-grained control.

```typescript
import { createAtom } from "./atom";

const [count, setCount] = createAtom(0);

// Read value
console.log(count.get()); // 0

// Update value
setCount(5);
console.log(count.get()); // 5

// Functional updates
setCount(prev => prev + 1);
console.log(count.get()); // 6
```

**Key characteristics:**
- ✅ Synchronous state reads and writes
- ✅ Automatic dependency tracking
- ✅ Batched re-rendering into a single frame

### 2. **JSX & The Fluid System**

VaporJS uses JSX for templating but processes it similar to SolidJS:

```tsx
import { jsx } from "./fluid-system/dom";

const [name, setName] = createAtom("World");

const Greeting = () => (
  <div>
    <h1>Hello, {name}!</h1>  {/* Reactive hole */}
    <p>Welcome to VaporJS</p>   {/* Static */}
  </div>
);
```

**What happens:**
1. JSX is transformed into `jsx()` function calls
2. VaporJS extracts **reactive holes** (e.g., `{name}`)
3. These holes are bound directly to DOM text nodes
4. When `name` changes, only that text node updates

**No virtual DOM. No diffing. Just direct bindings.**

### 3. **FrameSync Loop**

The magic happens in `syncFrame()`:

**What it does:**
```typescript
// Check which atoms changed (dirty flag)
const { syncFrame } = connectHoles(tree.holes);

// Starts the render loop
syncFrame();
// Update only affected DOM nodes
// Repeat next frame
```

**Key insight:** State updates flip a "dirty flag" on affected bindings. The render loop flushes these dirty nodes once per frame.

### 4. **Reactivity Flow**

```
User clicks button
  ↓
setCount(prev => prev + 1)  ← Atom updates instantly
  ↓
Marks dependent nodes as "dirty"
  ↓
["syncFrame" loop wait for next frame...]
  ↓
Flushes dirty nodes → Updates DOM
  ↓
Display refreshes → User sees change
```

**Timeline:**
- `t=0ms`: Button click, atom updates, dirty flag set
- `t=16ms`: Display refreshes, `syncFrame()` flushes dirty nodes
- Result: One render per frame, perfectly synced

## Architecture

### The FrameSync Pipeline

```
┌─────────────────────────────────┐
│     Atom Layer (State)          │
│  - Instant, synchronous updates │
│  - Dependency tracking          │
│  - Dirty flag management        │
└──────────────┬──────────────────┘
               │
               │ notifies
               ↓
┌─────────────────────────────────┐
│   Reactive Holes (Bindings)     │
│  - Maps atoms → DOM nodes       │
│  - Tracks "dirty" state         │
└──────────────┬──────────────────┘
               │
               │ reads
               ↓
┌─────────────────────────────────┐
│  FrameSync Loop (Rendering)     │
│  - Runs via requestAnimationFrame│
│  - Flushes dirty nodes once/frame│
│  - Updates DOM directly         │
└─────────────────────────────────┘
```

### Comparison to Other Frameworks

| Framework | State Updates | Rendering Trigger | Renders/Frame | Virtual DOM |
|-----------|---------------|-------------------|---------------|-------------|
| **React** | Batched (microtask) | State change | Multiple (batched) | Yes |
| **Vue 3** | Batched (microtask) | State change | Multiple (batched) | Yes |
| **Svelte** | Batched (microtask) | State change | Multiple (batched) | No (compiled) |
| **Solid.js** | Synchronous | State change | Multiple | No (fine-grained) |
| **VaporJS** | Synchronous | **rAF loop** | **Exactly one** | No (fine-grained) |

**The key difference:** VaporJS is the only framework that decouples rendering from state updates using FrameSync.

## Examples - Currently impossible due to lack of proper child node implementation

### Real-time Data Visualization

```tsx
const [dataPoints, setDataPoints] = createAtom([]);

// Simulate high-frequency updates (e.g., stock prices)
setInterval(() => {
  setDataPoints(prev => [
    ...prev,
    { time: Date.now(), value: Math.random() * 100 }
  ].slice(-50)); // Keep last 50 points
}, 10); // Updating every 10ms!

const Chart = () => (
  <svg width="500" height="200">
    {dataPoints().map((point, i) => (
      <circle
        cx={i * 10}
        cy={200 - point.value}
        r="2"
        fill="blue"
      />
    ))}
  </svg>
);

// Despite 100 updates/second, only renders at 60fps (or your display's refresh rate)
```

### Game-like Animation

```tsx
const [player, setPlayer] = createAtom({ x: 0, y: 0, vx: 0, vy: 0 });

// Physics update (runs every frame)
const update = (deltaTime) => {
  setPlayer(prev => ({
    x: prev.x + prev.vx * deltaTime,
    y: prev.y + prev.vy * deltaTime,
    vx: prev.vx * 0.98, // Friction
    vy: prev.vy * 0.98
  }));
};

// Input handling
document.addEventListener("keydown", (e) => {
  setPlayer(prev => {
    if (e.key === "ArrowRight") return { ...prev, vx: 5 };
    if (e.key === "ArrowLeft") return { ...prev, vx: -5 };
    if (e.key === "ArrowUp") return { ...prev, vy: -5 };
    if (e.key === "ArrowDown") return { ...prev, vy: 5 };
    return prev;
  });
});

const Game = () => (
  <div
    style={{
      position: "absolute",
      left: `${player().x}px`,
      top: `${player().y}px`,
      width: "50px",
      height: "50px",
      background: "blue"
    }}
  />
);

// Custom update loop
let lastTime = performance.now();
function gameLoop() {
  const now = performance.now();
  const deltaTime = (now - lastTime) / 1000; // Convert to seconds
  lastTime = now;

  update(deltaTime);

  requestAnimationFrame(gameLoop);
}
gameLoop();
```

## Expected Performance Characteristics

**Strengths:**
- ⚡ Extremely fast for high-frequency updates (no wasted renders)
- 🎯 Fine-grained reactivity (updates only changed nodes)
- 🔋 Battery-efficient (background tab optimization)
- 📦 Small bundle size (no virtual DOM, no compiler required)

**Trade-offs:**
- Initial render may be slightly slower than compiled frameworks (Svelte)
- No compiler optimizations (- yet, possible future direction)
- Manual JSX binding at runtime (could be optimized)

## Roadmap

### Near-term
- [ ] Effects API (`createEffect`, `createMemo`)
- [ ] Lifecycle hooks
- [ ] More examples and templates
- [ ] Performance benchmarks
- [ ] DevTools extension

### Future Exploration
- [ ] **Compiler approach**: Optimize reactive bindings at compile-time (like Solid.js)
- [ ] **ECS integration**: Bring Entity-Component-System patterns to DOM
- [ ] **WebGL/Canvas renderer**: Extend FrameSync beyond DOM
- [ ] **Time-slicing**: Optional work splitting for heavy computations
- [ ] **Concurrent rendering**: Pause/resume capability for large updates

## Philosophy

VaporJS is built on these principles:

1. **State and rendering are separate concerns**
   Like game engines, state mutations should be instant and rendering should sync to display hardware.

2. **Respect the display refresh rate**
   Rendering faster than 60/120/144Hz is wasted work. Sync to the frame.

3. **Fine-grained reactivity**
   Update only what changed. No virtual DOM, no diffing.

4. **Simple mental model**
   State is just data. Rendering is just a loop. No magic.

5. **Performance by design**
   Don't optimize bad architectures. Start with a good one.

## Inspiration

VaporJS draws inspiration from:

- **Game engines** (Unity, Godot, Bevy) - render loops and state separation
- **Solid.js** - fine-grained reactivity without virtual DOM
- **Three.js** - independent render loops
- **ECS architecture** - data-oriented design patterns
- The observation that web frameworks waste renders between display refreshes

## FAQ

### Why not use Solid.js?

Solid.js is amazing, but it still couples state changes to immediate DOM updates. VaporJS takes it further by decoupling rendering entirely via FrameSync.

### Will this work for forms and inputs?

Yes! State updates are instant, so your logic responds immediately. The visual update (DOM) happens on the next frame (< 16ms at 60fps), which is imperceptible to users.

### What about SSR/SSG?

VaporJS is currently client-focused (uses `requestAnimationFrame`). SSR/SSG support is on the roadmap, likely following a hydration approach similar to other frameworks.

### Can I use this in production?

VaporJS is **experimental**. It explores a novel rendering paradigm. Use at your own risk, but we'd love feedback!

### Why "Vapor"?

Like vapor, it's light and fast. And it's inspired by vaporwave aesthetics. Smooth, synchronized, and performant. 🌊✨

### Will there be a compiler?

Possibly! Right now VaporJS binds reactivity at runtime (like early Solid.js). A compiler could optimize this further, eliminating runtime overhead. It's on the roadmap.

## Contributing

We welcome contributions! VaporJS is an exploration of a new paradigm.

**Areas for help:**
- 🧪 Benchmarks and performance testing
- 📚 Documentation and examples
- 🛠️ Developer tooling (DevTools, VSCode extensions)
- 🎨 UI component library
- 🔬 Compiler exploration

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

**VaporJS**: Instant state. Frame-synced rendering. A new paradigm. 🎮✨

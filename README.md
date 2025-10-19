# 🎮 FrameSync / VaporJS

> A game-engine inspired UI framework that decouples state mutations from rendering, synchronizing DOM updates with your display's refresh rate.

## Why FrameSync?

Traditional UI frameworks like React, Vue, and Svelte couple state changes directly to rendering. When you update state, they immediately schedule a render—often multiple times per frame, wasting CPU cycles rendering updates the user will never see.

**FrameSync takes a different approach:** inspired by game engines, it separates state mutations from rendering entirely.

### The Problem with Traditional Frameworks
```javascript
// React/Vue/Svelte approach:
setState(1);  // Schedules render
setState(2);  // Schedules another render
setState(3);  // Schedules yet another render
// Result: Up to 3 renders in < 16ms, but display only shows once per frame
```

Even with batching optimizations, frameworks render faster than your display can show (60Hz/120Hz/144Hz). **You can't see updates faster than your refresh rate**, so why render them?

### The FrameSync Solution
```javascript
// FrameSync approach:
state.count = 1;  // Updates immediately (synchronous)
state.count = 2;  // Updates immediately (synchronous)
state.count = 3;  // Updates immediately (synchronous)
// Result: One render on next frame with final value
```

**State updates are instant.** Rendering syncs to your display's refresh rate via `requestAnimationFrame`. Like a game engine, state and rendering are separate concerns.

## Core Philosophy

### 🎯 State Updates: Instant & Synchronous
```javascript
// State mutations happen immediately
player.position.x = 100;
player.health = 50;
enemy.isActive = false;

// Changes are immediately readable
console.log(player.position.x); // 100 - no waiting!
```

No batching. No microtasks. No delays. State is just... state.

### 🖼️ Rendering: Frame-Synced via rAF
```javascript
// Render loop runs independently at display refresh rate
requestAnimationFrame(() => {
  // Read current state and update DOM
  render(player, enemy);
});
```

One render per frame. Perfectly synced with your display. Zero wasted renders.

## Installation
```bash
npm install framesync-ui
```

## Quick Start
```javascript
import { createApp } from 'framesync-ui';

const app = createApp({
  // Your state (plain objects)
  state: {
    count: 0,
    todos: []
  },

  // Render function (called every frame)
  render(state) {
    document.getElementById('count').textContent = state.count;
  }
});

// Update state instantly
document.getElementById('btn').onclick = () => {
  app.state.count++; // Instant update
  // DOM updates on next frame automatically
};
```

## Key Features

### ✅ No Wasted Renders
Renders only once per display frame, regardless of how many state mutations occur.

### ✅ Instant State Updates
State changes are synchronous—no waiting for microtasks, promises, or batching.

### ✅ Automatic Frame Sync
Uses `requestAnimationFrame` to align updates with your display's refresh rate (60Hz/120Hz/144Hz).

### ✅ Background Tab Optimization
When your tab is in the background, `rAF` automatically pauses—saving CPU and battery.

### ✅ Simple Mental Model
State is data. Rendering reads data. They're separate concerns, like in game engines.

### ✅ Predictable Performance
One state → One frame → One render. No surprises, no cascading updates.

## Architecture

### Game Engine Pattern

FrameSync follows the classic game loop architecture:
```
┌─────────────────┐
│  State Layer    │  ← Instant mutations (any time)
│  (Plain Data)   │
└────────┬────────┘
         │
         │ reads
         ↓
┌─────────────────┐
│  Render Loop    │  ← Frame-synced (60/120/144 FPS)
│  (rAF-driven)   │
└─────────────────┘
```

**Compare to traditional frameworks:**
```
Traditional:  State Change → Trigger Render → Update DOM
FrameSync:    State Change (instant) ← → Render Loop (independent)
```

### Why This Works

1. **Human perception is limited**: You can't see updates faster than ~165Hz
2. **Displays are the bottleneck**: Monitors refresh at 60Hz/120Hz/144Hz
3. **State logic is fast**: Most state mutations take < 1ms
4. **Rendering is expensive**: DOM updates are the slow part

**Separate them, and both run optimally.**

## Examples

### Counter App
```javascript
import { createApp } from 'framesync-ui';

const app = createApp({
  state: {
    count: 0
  },

  render(state) {
    const el = document.getElementById('counter');
    el.textContent = `Count: ${state.count}`;
  }
});

// Updates are instant
setInterval(() => {
  app.state.count++;
}, 10); // Updating every 10ms, but rendering at 60fps
```

### Todo List
```javascript
const app = createApp({
  state: {
    todos: [],
    filter: 'all'
  },

  render(state) {
    const filtered = state.todos.filter(t =>
      state.filter === 'all' || t.status === state.filter
    );

    document.getElementById('todos').innerHTML = filtered
      .map(t => `<li>${t.text}</li>`)
      .join('');
  }
});

// Add todo (instant)
app.state.todos.push({ text: 'Learn FrameSync', status: 'active' });

// Change filter (instant)
app.state.filter = 'active';

// Both render on next frame
```

### Animation / Game-like Interaction
```javascript
const app = createApp({
  state: {
    player: { x: 0, y: 0 },
    enemies: []
  },

  render(state, deltaTime) {
    // deltaTime = ms since last frame
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillRect(state.player.x, state.player.y, 50, 50);

    state.enemies.forEach(e => {
      ctx.fillRect(e.x, e.y, 30, 30);
    });
  }
});

// Game loop updates (runs every frame via rAF)
app.onUpdate((state, deltaTime) => {
  // Physics/logic updates happen here
  state.player.x += state.player.velocityX * deltaTime;
  state.player.y += state.player.velocityY * deltaTime;

  // Collision detection, AI, etc.
});

// Input handling (instant state updates)
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') state.player.velocityX = 5;
  if (e.key === 'ArrowLeft') state.player.velocityX = -5;
});
```

## API Reference

### `createApp(options)`

Creates a new FrameSync application.
```javascript
const app = createApp({
  state: {},        // Initial state (plain object)
  render(state) {}, // Render function (called every frame)
  onUpdate(state, deltaTime) {} // Optional: Update hook
});
```

### `app.state`

Direct access to application state. Mutations are instant and synchronous.
```javascript
app.state.count = 10;
console.log(app.state.count); // 10 (immediately)
```

### `app.render(state, deltaTime)`

Called automatically every frame. Receives current state and time since last frame.

- `state`: Current application state
- `deltaTime`: Milliseconds since last frame (useful for animations)

### `app.onUpdate(callback)`

Optional hook for frame-based logic updates (physics, AI, etc.).
```javascript
app.onUpdate((state, deltaTime) => {
  // Update game logic, animations, etc.
  state.position.x += state.velocity * deltaTime;
});
```

### `app.start()` / `app.stop()`

Control the render loop.
```javascript
app.start();  // Starts rAF loop
app.stop();   // Stops rAF loop
```

## Performance Characteristics

### Traditional Framework (e.g., React)
```
User clicks button (t=0ms)
  → setState queued
  → Microtask scheduled
  → Reconciliation (t=1ms)
  → DOM update (t=2ms)
  → Display refresh (t=16ms)
```

**Multiple updates in one frame:**
```
setState #1 (t=0ms) → render
setState #2 (t=5ms) → render
setState #3 (t=10ms) → render
Display refresh (t=16ms) → shows only final result
```

### FrameSync
```
User clicks button (t=0ms)
  → State updates instantly (t=0ms)
  → Display refresh (t=16ms) → render with current state
```

**Multiple updates in one frame:**
```
state.count = 1 (t=0ms)  ← instant
state.count = 2 (t=5ms)  ← instant
state.count = 3 (t=10ms) ← instant
Display refresh (t=16ms) → render once with count=3
```

## Comparisons

| Feature | React 18+ | Vue 3 | Solid.js | FrameSync |
|---------|-----------|-------|----------|-----------|
| **State updates** | Batched (microtask) | Batched (microtask) | Synchronous | Synchronous |
| **Rendering** | Priority-based | Microtask queue | Fine-grained sync | Frame-synced (rAF) |
| **Renders per frame** | Multiple (batched) | Multiple (batched) | Multiple | Exactly one |
| **Can pause rendering?** | Yes (concurrent) | No | No | No (completes in frame budget) |
| **Background tab behavior** | Still renders | Still renders | Still renders | Auto-pauses (rAF) |
| **Mental model** | Component-based | Component-based | Reactive signals | Game loop |
| **Best for** | Complex apps | General purpose | Fine-grained updates | Performance-critical, visual apps |

## When to Use FrameSync

### ✅ Great For:

- **Data visualizations** (charts, graphs, dashboards)
- **Real-time applications** (live feeds, trading platforms)
- **Games and simulations**
- **Animation-heavy UIs**
- **High-frequency updates** (websockets, sensors)
- **Performance-critical applications**

### ⚠️ Consider Alternatives For:

- **Form-heavy applications** (traditional CRUD apps)
- **Server-side rendering** (SSR/SSG) - rAF doesn't exist on server
- **Apps requiring immediate visual feedback** (typing indicators, autocomplete) - though state updates are still instant

## FAQ

### Q: Won't rAF make my app feel laggy?

**No.** State updates are instant. Only rendering waits for the next frame, which happens at your display's refresh rate (typically 60-144 times per second). This is imperceptible to users.

### Q: What about form inputs?

State updates are synchronous, so your application logic can respond immediately. The visual update (DOM) happens on the next frame (< 16ms), which is fast enough for great UX.

### Q: How is this different from React's concurrent mode?

React's concurrent mode can pause and resume rendering work, prioritizing urgent updates. FrameSync doesn't pause rendering—it completes one full render per frame. State updates are instant, and rendering is deterministic.

### Q: Does this work with TypeScript?

Yes! FrameSync is written in TypeScript with full type definitions.

### Q: What about SSR/SSG?

FrameSync is client-side focused (uses `requestAnimationFrame`). For SSR, you'd render initial state server-side, then hydrate client-side with the render loop.

### Q: Can I use this with existing frameworks?

FrameSync is a standalone framework with a different architecture. You can't easily integrate it with React/Vue/etc. because they couple state and rendering differently.

## Inspiration

FrameSync is inspired by:

- **Game engines** (Unity, Unreal, Godot) - separation of game state and rendering
- **Three.js** - render loops independent of state updates
- **ECS architecture** (Entity-Component-System) - data-oriented design
- The observation that web frameworks render faster than displays can show

## Contributing

We welcome contributions! This is an experimental framework exploring a different paradigm.

Areas for contribution:
- Performance benchmarks vs other frameworks
- Developer tooling (DevTools extension)
- More examples and templates
- Documentation improvements

## License

MIT

---

**FrameSync**: State at the speed of thought. Rendering at the speed of light (well, 60-144 FPS). 🎮✨

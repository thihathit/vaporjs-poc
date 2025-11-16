import { connectHoles } from "./fluid-system/flusher";
import { createEffect, createSignal } from "./fluid-system/signal";
import { jsx } from "./fluid-system/dom";
import { useWorker } from "./utilities";

const [input, setInput] = createSignal("A");
const [count1, setCount1] = createSignal(0);
const [count2, setCount2] = createSignal(0);

const increase2 = () => {
  setCount2((prev) => prev + 1);
};

useWorker(
  // Worker thread: send a tick message every 10ms
  () => setInterval(() => postMessage("tick"), 10),
  (data) => {
    if (data === "tick") setCount1((prev) => prev + 1);
  },
);

createEffect(() => {
  console.log(`Count 1: ${count1()} | Count 2: ${count2()}`);
});

// const App = () => <p>Counter 1: {count1}</p>;
const App = () => (
  <div>
    <div>
      <p>Counter 1: {count1}</p>
    </div>

    <hr />

    <div>
      <p>Counter 2: {count2}</p>

      <button onClick={increase2}>Increment</button>
    </div>

    <hr />

    <div>
      <p>Input: {input}</p>

      <input
        type="text"
        value={input}
        onInput={(e) => {
          setInput(e.target.value);
        }}
      />
    </div>
  </div>
);

const tree = App();
const { syncFrame } = connectHoles(tree.holes);

syncFrame();

document.querySelector("#app")!.append(tree.fragment);

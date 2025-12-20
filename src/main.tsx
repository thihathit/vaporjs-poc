import { connectHoles } from "./fluid-system/flusher";
import { createAtom } from "./fluid-system/atom";
import { jsx } from "./fluid-system/dom";
import { useWorker } from "./utilities";

const [count1, setCount1] = createAtom(0);
const [count2, setCount2] = createAtom(0);

const increase2 = () => {
  setCount2((prev) => prev + 1);
};

count1.subscribe((value) => {
  console.log(`Count 1 changed to ${value}`);
});
useWorker(
  // Worker thread: send a tick message every 10ms
  () => setInterval(() => postMessage("tick"), 10),
  (data) => {
    if (data === "tick") setCount1((prev) => prev + 1);
  },
);

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
  </div>
);

const tree = App();
const { syncFrame } = connectHoles(tree.holes);

syncFrame();

document.querySelector("#app")!.append(tree.fragment);

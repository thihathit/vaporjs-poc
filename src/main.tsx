import { connectHoles } from "./fluid-system/flusher";
import { createAtom } from "./fluid-system/atom";

// transformer hints
import { jsx } from "./fluid-system/dom";

const [count1, setCount1] = createAtom(0);
const [count2, setCount2] = createAtom(0);

const increase2 = () => {
  setCount2((prev) => prev + 1);
};

setInterval(() => {
  setCount1((prev) => prev + 1);
}, 10);

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

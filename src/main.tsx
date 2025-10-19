import { connectHoles } from "./fluid-system/flusher";
import { createAtom } from "./fluid-system/atom";

const [count, setCount] = createAtom(0);

const App = () => (
  <div>
    <p>Count: {count}</p>

    <button
      onclick={() => {
        setCount((prev) => prev + 1);
      }}
    >
      Increment
    </button>
  </div>
);

const tree = App();
const { syncFrame } = connectHoles(tree.holes);

syncFrame();

document.querySelector("#app")!.append(tree.fragment);

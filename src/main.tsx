import { connectHoles } from "./fluid-system/flusher";
import { createAtom } from "./fluid-system/atom";
import { Fragment, jsx } from "./fluid-system/dom";
import { useWorker } from "./utilities";

const Counter1 = () => {
  const [count1, setCount1] = createAtom(0);

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

  const list = [count1, count1];

  return (
    <div>
      <p>Counter 1: {count1}</p>
      {list.map((item, index) => (
        <p>
          Liste item {index}: {item}
        </p>
      ))}
      <form>
        <input type="text" value={count1} />
        <button type="reset">Reset</button>
      </form>
    </div>
  );
};

const Counter2 = () => {
  const [count2, setCount2] = createAtom(0);

  const increase2 = () => {
    setCount2((prev) => prev + 1);
  };

  return (
    <div>
      <p>Counter 2: {count2}</p>

      <button onClick={increase2}>Increment</button>
    </div>
  );
};

const App = () => (
  <Fragment>
    <Counter1 />

    <hr />

    <Counter2 />
  </Fragment>
);

const tree = App();
const { syncFrame } = connectHoles(tree.holes);

console.log(tree);

syncFrame();

document.querySelector("#app")!.append(tree.fragment);

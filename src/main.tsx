import { connectHoles } from "./fluid-system/flusher";
import { createSignal, createEffect, createMemo } from "./fluid-system/signal";
import { Fragment, jsx, Index } from "./fluid-system/dom";
import { useWorker } from "./utilities";

const Counter1 = () => {
  const [count1, setCount1] = createSignal(0);

  useWorker(
    // Worker thread: send a tick message every 10ms
    () => setInterval(() => postMessage("tick"), 10),
    (data) => {
      if (data === "tick") setCount1((prev) => prev + 1);
    },
  );

  // Original usage: memo that returns an array of values
  const list = createMemo(() => [count1(), count1()]);

  createEffect(() => {
    console.log(`Count 1 changed to ${list().join()}`);
  });
  return (
    <div>
      <p>Counter 1: {count1}</p>
      <Index each={list}>
        {(item: any, index: number) => (
          <p>
            Liste item {index}: {item}
          </p>
        )}
      </Index>
      <form>
        <input type="text" value={count1} />
        <button type="reset">Reset</button>
      </form>
    </div>
  );
};

const Counter2 = () => {
  const [count2, setCount2] = createSignal(0);

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

import { Index, jsx } from "./web";
import { connectHoles } from "./web/flusher";

import { createMemo, createSignal } from "./signal";

import { useWorker } from "./utilities";

const Counter1 = () => {
  const [count1, setCount1] = createSignal(0);

  const increase1 = () => {
    setCount1((prev) => prev + 1);
  };

  useWorker(
    // Worker thread: send a tick message every 10ms
    () => setInterval(() => postMessage("tick"), 10),
    (data) => {
      if (data === "tick") increase1();
    },
  );

  return (
    <div>
      <p>Counter 1: {count1}</p>
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

const FormFields = () => {
  const [input, setInput] = createSignal("A");

  return (
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
  );
};

const MemoizeTest = () => {
  const [memoizeTest, setMem] = createSignal(3);
  const doubledM = createMemo(() => {
    console.log("computed");
    return memoizeTest() * 2;
  });

  return (
    <div>
      <p>
        memoizeTest: {memoizeTest} | {doubledM}
      </p>
      <button onClick={() => setMem(3)}>Three</button>
      <button onClick={() => setMem(4)}>Four</button>
    </div>
  );
};

const List = () => {
  const [dList, setDList] = createSignal([0, 2]);

  return (
    <div>
      <button onClick={() => setDList((prev) => [...prev, Math.random()])}>
        Add
      </button>
      <button
        onClick={() => setDList(([, ...rest]) => [Math.random(), ...rest])}
      >
        Update First
      </button>

      <Index each={dList}>
        {(item, index) => (
          <p>
            Liste item {index}: {item}
          </p>
        )}
      </Index>
    </div>
  );
};

const App = () => (
  <div>
    <Counter1 />

    <hr />

    <Counter2 />

    <hr />

    <FormFields />

    <hr />

    <MemoizeTest />

    <hr />

    <List />
  </div>
);

const tree = App();
const { syncFrame } = connectHoles(tree.holes);

syncFrame();

document.querySelector("#app")!.append(tree.fragment);

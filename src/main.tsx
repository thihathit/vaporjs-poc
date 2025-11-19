import { connectHoles } from "./fluid-system/flusher";
import { createEffect, createMemo, createSignal } from "./fluid-system/signal";
import { Index, jsx } from "./fluid-system/dom";
import { shallowEqual, useWorker } from "./utilities";

const [input, setInput] = createSignal("A");
const [count1, setCount1] = createSignal(0);
const [count2, setCount2] = createSignal(0);
const [dList, setDList] = createSignal([0, 2]);

const debug = createMemo(() => JSON.stringify(dList(), null, 2));

const [memoizeTest, setMem] = createSignal(3);
const doubledM = createMemo(() => {
  console.log("computed");
  return memoizeTest() * 2;
});

const counters = createMemo(() => ({
  count1: count1(),
  count2: count2(),
}));

const everything = createMemo(
  () => ({
    counters: counters().count2,
    input: input(),
  }),
  shallowEqual,
);

// Original usage: memo that returns an array of values
const list = createMemo(() => [count1(), count1()]);

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
  console.log(everything());
  // console.log(`Count 1: ${count1()} | Count 2: ${count2()}`);
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

    <hr />

    <p>
      memoizeTest: {memoizeTest} | {doubledM}
    </p>
    <button onClick={() => setMem(3)}>Three</button>
    <button onClick={() => setMem(4)}>Four</button>

    <hr />

    <Index each={list}>
      {(item, index) => (
        <p>
          Liste item {index}: {item}
        </p>
      )}
    </Index>

    <hr />

    <button onClick={() => setDList((prev) => [...prev, Math.random()])}>
      Add
    </button>
    <button onClick={() => setDList(([, ...rest]) => [Math.random(), ...rest])}>
      Update First
    </button>

    {/*<pre>{debug}</pre>*/}

    <Index each={dList}>
      {(item, index) => (
        <p>
          Liste item {index}: {item}
        </p>
      )}
    </Index>
  </div>
);

const tree = App();
const { syncFrame } = connectHoles(tree.holes);

syncFrame();

document.querySelector("#app")!.append(tree.fragment);

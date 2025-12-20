export const useWorker = (
  script: string | (() => void),
  onMessage?: (data: any) => void,
) => {
  const code =
    typeof script === "function" ? `(${script.toString()})()` : String(script);

  const blob = new Blob([code], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);

  const messageHandler = (e: MessageEvent) => {
    onMessage?.(e.data);
  };
  worker.addEventListener("message", messageHandler);

  const unloadHandler = () => {
    try {
      worker.removeEventListener("message", messageHandler);
      worker.terminate();
    } finally {
      // always revoke the object URL and remove the unload listener
      URL.revokeObjectURL(url);
      window.removeEventListener("beforeunload", unloadHandler);
    }
  };

  window.addEventListener("beforeunload", unloadHandler);

  return {
    worker,
    post: (msg: any) => worker.postMessage(msg),
    terminate: unloadHandler,
  };
};

// Stockfish Web Worker wrapper for MutantChess
let engine = null;
let isReady = false;
let commandQueue = [];

function initStockfish() {
  try {
    importScripts('/stockfish/stockfish-18-lite-single.js');
    if (typeof Stockfish === 'function') {
      const factory = Stockfish();
      factory({
        locateFile: (file) => {
          return '/stockfish/stockfish-18-lite-single.wasm';
        },
        listener: (line) => {
          self.postMessage({ type: 'output', line: line });
        }
      }).then((instance) => {
        engine = instance;
        isReady = true;
        self.postMessage({ type: 'ready' });
        flushQueue();
      }).catch((err) => {
        self.postMessage({ type: 'error', error: err ? err.toString() : 'WASM init error' });
      });
    }
  } catch (err) {
    self.postMessage({ type: 'error', error: err ? err.toString() : 'Worker load error' });
  }
}

function flushQueue() {
  if (!isReady || !engine) return;
  while (commandQueue.length > 0) {
    const cmd = commandQueue.shift();
    sendCommand(cmd);
  }
}

function sendCommand(cmd) {
  if (!isReady || !engine) {
    commandQueue.push(cmd);
    return;
  }
  try {
    engine.ccall('command', null, ['string'], [cmd]);
  } catch (err) {
    self.postMessage({ type: 'error', error: err ? err.toString() : 'Command error' });
  }
}

self.onmessage = function (e) {
  const data = e.data;
  if (typeof data === 'string') {
    sendCommand(data);
  } else if (data && data.cmd) {
    sendCommand(data.cmd);
  }
};

initStockfish();

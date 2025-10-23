import { API_URLS } from '../../config';

const WS_COMPLETIONS_TIMEOUT_DURATION = 10_000;
const MAX_RECONNECT_RETRIES = 5;

const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
};

const state = {
  connection: null,
  connectionState: ConnectionState.DISCONNECTED,
  retryAttempt: 0,
};

const pendingRequest = new Map();
let nextId = 1;
let queuedRequest = null;

export function completionCallback(callback, project, line, ch) {
  const id = String(nextId++);

  const timeout = setTimeout(() => {
    pendingRequest.delete(id);
    callback([]);
  }, WS_COMPLETIONS_TIMEOUT_DURATION);

  pendingRequest.set(id, { callback, timeout });

  const files = project['files'];

  const message = {
    requestId: id,
    completionRequest: { files },
    line,
    ch,
  };

  if (isConnectionReady()) {
    safeSend(state.connection, message);
    try {
      state.connection.send(JSON.stringify(message));
    } catch (error) {
      queuedRequest = message;
      handleDisconnect();
    }
  } else {
    queuedRequest = message;
    connect();
  }
}

function connect() {
  if (
    isConnectionReady() ||
    state.connectionState === ConnectionState.CONNECTING
  ) {
    return;
  }

  state.connectionState = ConnectionState.CONNECTING;

  try {
    const ws = new WebSocket(API_URLS.COMPLETE_WEBSOCKET());
    state.connection = ws;

    ws.onopen = () => {
      state.connectionState = ConnectionState.CONNECTED;
      state.retryAttempt = 0;

      if (queuedRequest) safeSend(ws, queuedRequest);
    };

    ws.onmessage = handleMessage;

    ws.onerror = () => {
      handleDisconnect(true);
    };

    ws.onclose = (event) => {
      const tryReconnect = event.code !== 1000;
      handleDisconnect(tryReconnect);
    };
  } catch {
    handleDisconnect(true);
  }
  return true;
}

function handleMessage(msg) {
  let payload;
  try {
    payload = JSON.parse(msg.data);
  } catch {
    return;
  }

  if (payload.requestId) {
    const entry = pendingRequest.get(payload.requestId);
    if (!entry) return;

    clearTimeout(entry.timeout);
    pendingRequest.delete(payload.requestId);

    if (payload.completions) {
      entry.callback(payload.completions);
    } else {
      console.error(payload.message);
      entry.callback([]);
    }
  }
}

function handleDisconnect(tryReconnect) {
  if (isConnectionReady()) return;
  state.connectionState = ConnectionState.DISCONNECTED;
  pendingRequest.forEach((_, entry) => {
    entry.callback([]);
    clearTimeout(entry.timeout);
  });

  if (tryReconnect && state.retryAttempt <= MAX_RECONNECT_RETRIES) {
    state.retryAttempt++;
    connect();
  } else {
    try {
      state.connection.close();
    } finally {
      state.connection = null;
      state.retryAttempt = 0;
    }
  }
}

function safeSend(ws, message) {
  try {
    ws.send(JSON.stringify(message));
    if (queuedRequest && queuedRequest.requestId === message.requestId)
      queuedRequest = null;
  } catch (err) {
    console.warn(`Failed to send ${message}: `, err);
    queuedRequest = message;
    handleDisconnect(true);
  }
}

function isConnectionReady() {
  return (
    state.connection &&
    state.connectionState === ConnectionState.CONNECTED &&
    state.connection.readyState === WebSocket.OPEN
  );
}

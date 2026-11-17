import { Client, type IFrame, type StompConfig, type StompSubscription, type messageCallbackType } from '@stomp/stompjs';
import { API_BASE } from '@/lib/api/client';

export function resolveWsBrokerUrl(apiBase: string = API_BASE): string {
  const trimmed = apiBase.replace(/\/+$/, '');
  if (trimmed.startsWith('https://')) {
    return `wss://${trimmed.slice('https://'.length)}/api/v1/ws`;
  }
  if (trimmed.startsWith('http://')) {
    return `ws://${trimmed.slice('http://'.length)}/api/v1/ws`;
  }
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}${trimmed}/api/v1/ws`;
  }
  return 'ws://localhost:8080/api/v1/ws';
}

export type StompConsumer = {
  /** Applied on every (re)connect; each `id` must be unique across consumers. */
  subscriptions?: { destination: string; callback: messageCallbackType; id: string }[];
  /** `isReconnect` is per consumer: false on the first connect this consumer sees. */
  onConnect?: (isReconnect: boolean) => void;
  onDisconnect?: () => void;
  onWebSocketClose?: () => void;
  onStompError?: (frame: IFrame) => void;
};

export type StompHandle = {
  readonly client: Client;
  release: () => void;
};

type Entry = { consumer: StompConsumer; subs: StompSubscription[]; connectedOnce: boolean };

let createClient = (config: StompConfig) => new Client(config);
let client: Client | null = null;
const entries = new Set<Entry>();
let teardownTimer: ReturnType<typeof setTimeout> | null = null;

/** Test seam only: swap the Client constructor so tests never open a socket. */
export function setStompClientFactoryForTests(factory: (config: StompConfig) => Client) {
  createClient = factory;
}

function attach(entry: Entry, active: Client) {
  entry.subs = (entry.consumer.subscriptions ?? []).map(({ destination, callback, id }) =>
    active.subscribe(destination, callback, { id })
  );
  const isReconnect = entry.connectedOnce;
  entry.connectedOnce = true;
  entry.consumer.onConnect?.(isReconnect);
}

function detach(entry: Entry) {
  for (const sub of entry.subs) {
    try {
      sub.unsubscribe();
    } catch {
      // Socket may already be closed
    }
  }
  entry.subs = [];
}

function ensureClient(): Client {
  if (client) return client;
  const created = createClient({
    brokerURL: resolveWsBrokerUrl(),
    // Reconciled from the two former clients (chat 3s/15s, notifications 4s/20s): keep the faster chat values.
    reconnectDelay: 3_000,
    heartbeatIncoming: 15_000,
    heartbeatOutgoing: 15_000,
    onConnect: () => entries.forEach((entry) => attach(entry, created)),
    onDisconnect: () => entries.forEach((entry) => entry.consumer.onDisconnect?.()),
    onWebSocketClose: () => entries.forEach((entry) => entry.consumer.onWebSocketClose?.()),
    onStompError: (frame) => entries.forEach((entry) => entry.consumer.onStompError?.(frame)),
  });
  client = created;
  return created;
}

export function acquireStompConnection(consumer: StompConsumer): StompHandle {
  if (teardownTimer) {
    clearTimeout(teardownTimer);
    teardownTimer = null;
  }
  const active = ensureClient();
  const entry: Entry = { consumer, subs: [], connectedOnce: false };
  entries.add(entry);
  if (active.connected) attach(entry, active);
  // Also revives a client that a consumer deactivated (e.g. after UNAUTHORIZED).
  else if (!active.active) active.activate();

  let released = false;
  return {
    client: active,
    release: () => {
      if (released) return;
      released = true;
      detach(entry);
      entries.delete(entry);
      if (entries.size > 0 || teardownTimer) return;
      // Deferred so a StrictMode unmount/remount reuses the socket instead of churning it.
      teardownTimer = setTimeout(() => {
        teardownTimer = null;
        if (entries.size > 0 || !client) return;
        const stale = client;
        client = null;
        void stale.deactivate();
      }, 0);
    },
  };
}

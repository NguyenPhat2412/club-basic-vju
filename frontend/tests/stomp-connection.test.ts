import assert from "node:assert/strict";
import test from "node:test";
import type { Client, StompConfig } from "@stomp/stompjs";
import { acquireStompConnection, setStompClientFactoryForTests } from "@/lib/realtime/stomp-connection";

type FakeClient = {
  config: StompConfig;
  connected: boolean;
  active: boolean;
  activations: number;
  deactivations: number;
  subscribed: string[];
  unsubscribed: string[];
  connect: () => void;
  dropSocket: () => void;
};

const created: FakeClient[] = [];

setStompClientFactoryForTests((config) => {
  const fake: FakeClient = {
    config,
    connected: false,
    active: false,
    activations: 0,
    deactivations: 0,
    subscribed: [],
    unsubscribed: [],
    connect() {
      fake.connected = true;
      config.onConnect?.({} as never);
    },
    dropSocket() {
      fake.connected = false;
      config.onWebSocketClose?.({} as never);
    },
  };
  created.push(fake);
  const client = {
    get connected() { return fake.connected; },
    get active() { return fake.active; },
    activate() { fake.active = true; fake.activations += 1; },
    async deactivate() { fake.active = false; fake.connected = false; fake.deactivations += 1; },
    subscribe(destination: string, _cb: unknown, headers: { id: string }) {
      fake.subscribed.push(`${headers.id}:${destination}`);
      return { id: headers.id, unsubscribe: () => fake.unsubscribed.push(headers.id) };
    },
  };
  return client as unknown as Client;
});

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

test("two consumers share one client; teardown only after the last release", async () => {
  created.length = 0;
  const a = acquireStompConnection({ subscriptions: [{ destination: "/user/queue/a", callback: () => {}, id: "a" }] });
  const b = acquireStompConnection({ subscriptions: [{ destination: "/user/queue/b", callback: () => {}, id: "b" }] });
  assert.equal(created.length, 1);
  assert.equal(a.client, b.client);
  const fake = created[0];
  assert.equal(fake.activations, 1);

  fake.connect();
  assert.deepEqual(fake.subscribed, ["a:/user/queue/a", "b:/user/queue/b"]);

  a.release();
  a.release(); // idempotent
  await tick();
  assert.deepEqual(fake.unsubscribed, ["a"]);
  assert.equal(fake.deactivations, 0);
  assert.equal(fake.active, true);

  b.release();
  await tick();
  assert.equal(fake.deactivations, 1);
});

test("subscriptions are re-applied on reconnect and onConnect reports isReconnect per consumer", async () => {
  created.length = 0;
  const seen: boolean[] = [];
  const handle = acquireStompConnection({
    subscriptions: [{ destination: "/user/queue/x", callback: () => {}, id: "x" }],
    onConnect: (isReconnect) => seen.push(isReconnect),
  });
  const fake = created[0];
  fake.connect();
  fake.dropSocket();
  fake.connect();
  assert.deepEqual(fake.subscribed, ["x:/user/queue/x", "x:/user/queue/x"]);
  assert.deepEqual(seen, [false, true]);

  // A late joiner on a live socket is attached immediately, as a first connect.
  const lateSeen: boolean[] = [];
  const late = acquireStompConnection({
    subscriptions: [{ destination: "/user/queue/y", callback: () => {}, id: "y" }],
    onConnect: (isReconnect) => lateSeen.push(isReconnect),
  });
  assert.deepEqual(lateSeen, [false]);
  assert.equal(fake.subscribed.at(-1), "y:/user/queue/y");

  handle.release();
  late.release();
  await tick();
  assert.equal(fake.deactivations, 1);
});

test("StrictMode release/acquire in the same tick keeps the same client", async () => {
  created.length = 0;
  const first = acquireStompConnection({});
  first.release();
  const second = acquireStompConnection({});
  await tick();
  assert.equal(created.length, 1);
  assert.equal(created[0].deactivations, 0);
  second.release();
  await tick();
  assert.equal(created[0].deactivations, 1);

  // After full teardown a fresh acquire builds a new client.
  const third = acquireStompConnection({});
  assert.equal(created.length, 2);
  third.release();
  await tick();
});

test("uses exponential reconnect backoff, Worker heartbeat ticker, and deactivates on 401 session probe after repeated handshake failures", async () => {
  created.length = 0;
  const origFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    return new Response(null, { status: 401 });
  }) as typeof fetch;

  try {
    const handle = acquireStompConnection({});
    const fake = created[0];
    assert.equal(fake.config.reconnectDelay, 2_000);
    assert.equal(fake.config.maxReconnectDelay, 30_000);
    assert.ok(fake.config.reconnectTimeMode !== undefined, "must set exponential reconnectTimeMode");
    assert.ok(fake.config.heartbeatStrategy !== undefined, "must set Worker heartbeatStrategy");
    assert.equal(fake.config.heartbeatToleranceMultiplier, 3);

    // First attempt: no extra HTTP probe on healthy initial dial
    await fake.config.beforeConnect?.(handle.client);
    assert.equal(fetchCalls, 0);

    // Simulate 2 consecutive failed WebSocket handshakes (close without ever connecting)
    fake.dropSocket();
    await fake.config.beforeConnect?.(handle.client);
    assert.equal(fetchCalls, 0);

    fake.dropSocket();
    await fake.config.beforeConnect?.(handle.client);
    assert.equal(fetchCalls, 1);
    assert.equal(fake.deactivations, 1, "401 session probe must deactivate STOMP client to stop infinite WS error spam");

    handle.release();
    await tick();
  } finally {
    globalThis.fetch = origFetch;
  }
});

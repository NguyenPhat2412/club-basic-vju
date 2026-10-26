"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Key = readonly unknown[];
type QueryOptions<T> = { queryKey: Key; queryFn: () => Promise<T>; enabled?: boolean; retry?: number; staleTime?: number; placeholderData?: unknown };
type QueryState<T> =
  | { data: T | undefined; error: undefined; isPending: true; isSuccess: false; isError: false; isFetching: boolean; refetch: () => Promise<void> }
  | { data: T; error: undefined; isPending: false; isSuccess: true; isError: false; isFetching: boolean; refetch: () => Promise<void> }
  | { data: T | undefined; error: unknown; isPending: false; isSuccess: false; isError: true; isFetching: boolean; refetch: () => Promise<void> };
type MutationOptions<T, V> = { mutationFn: (variables: V) => Promise<T>; onSuccess?: (data: T, variables: V) => void | Promise<void> };

const subscribers = new Set<(key?: Key, clear?: boolean) => void>();
const matches = (key: Key, prefix?: Key) => !prefix || prefix.every((value, index) => key[index] === value);

/** Fetch-backed data hook. Requests are issued by fetch through apiModel query functions. */
export function useFetchQuery<T>(options: QueryOptions<T>): QueryState<T> {
  const key = JSON.stringify(options.queryKey);
  const enabled = options.enabled !== false;
  const queryFn = useRef(options.queryFn);
  const queryKey = useRef(options.queryKey);
  useEffect(() => { queryFn.current = options.queryFn; }, [options.queryFn]);
  useEffect(() => { queryKey.current = options.queryKey; }, [options.queryKey]);
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>();
  const [isPending, setPending] = useState(true);
  const [isFetching, setFetching] = useState(false);
  const run = useCallback(async () => {
    if (!enabled) return;
    setFetching(true); setError(undefined);
    try { setData(await queryFn.current()); setPending(false); }
    catch (cause) { setError(cause); setPending(false); }
    finally { setFetching(false); }
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => { void run(); }, 0);
    return () => clearTimeout(timer);
  }, [key, enabled, run]);
  useEffect(() => {
    const listener = (changed?: Key, clear?: boolean) => {
      if (clear) { setData(undefined); setError(undefined); setPending(true); }
      if (clear || matches(queryKey.current, changed)) void run();
    };
    subscribers.add(listener);
    return () => { subscribers.delete(listener); };
  }, [key, run]);
  const refetch = run;
  if (isPending) return { data, error: undefined, isPending: true, isSuccess: false, isError: false, isFetching, refetch };
  if (error !== undefined) return { data, error, isPending: false, isSuccess: false, isError: true, isFetching, refetch };
  if (data !== undefined) return { data, error: undefined, isPending: false, isSuccess: true, isError: false, isFetching, refetch };
  return { data: undefined, error: new Error("Query completed without data"), isPending: false, isSuccess: false, isError: true, isFetching, refetch };
}

export function useFetchMutation<T, V = void>(options: MutationOptions<T, V>) {
  const [error, setError] = useState<unknown>();
  const [isPending, setPending] = useState(false);
  const mutateAsync = async (variables?: V) => {
    setPending(true); setError(undefined);
    try { const result = await options.mutationFn(variables as V); await options.onSuccess?.(result, variables as V); return result; }
    catch (cause) { setError(cause); throw cause; }
    finally { setPending(false); }
  };
  return { error, isPending, mutate: (variables?: V) => { void mutateAsync(variables).catch(() => undefined); }, mutateAsync, reset: () => setError(undefined) };
}

/** Loads a variable number of independent fetch requests without variable hook calls. */
export function useFetchQueries<T>({ queries }: { queries: QueryOptions<T>[] }): QueryState<T>[] {
  const key = JSON.stringify(queries.map((query) => query.queryKey));
  const queryFns = useRef(queries.map((query) => query.queryFn));
  useEffect(() => { queryFns.current = queries.map((query) => query.queryFn); }, [queries]);
  const [states, setStates] = useState<QueryState<T>[]>([]);
  const load = useCallback(async () => {
    const currentFns = queryFns.current;
    setStates((previous) => currentFns.map((_, index): QueryState<T> => ({ data: previous[index]?.data, error: undefined, isPending: true, isSuccess: false, isError: false, isFetching: true, refetch: async () => {} })));
    const next = await Promise.all(currentFns.map(async (queryFn) => {
      try {
        const result: QueryState<T> = { data: await queryFn(), error: undefined, isPending: false, isSuccess: true, isError: false, isFetching: false, refetch: async () => {} };
        return result;
      } catch (error) {
        const result: QueryState<T> = { data: undefined, error, isPending: false, isSuccess: false, isError: true, isFetching: false, refetch: async () => {} };
        return result;
      }
    }));
    setStates(next);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [key, load]);
  useEffect(() => {
    const listener = (_changed?: Key, clear?: boolean) => { if (clear) setStates([]); void load(); };
    subscribers.add(listener);
    return () => { subscribers.delete(listener); };
  }, [load]);
  return states;
}

export function useFetchClient() {
  return {
    invalidateQueries: ({ queryKey }: { queryKey: Key }) => { subscribers.forEach((listener) => listener(queryKey)); },
    clear: () => { subscribers.forEach((listener) => listener(undefined, true)); },
  };
}

export const keepFetchData = <T,>(previous: T) => previous;

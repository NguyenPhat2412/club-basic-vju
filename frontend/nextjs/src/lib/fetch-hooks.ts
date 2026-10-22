"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Key = readonly unknown[];
type QueryOptions<T> = { queryKey: Key; queryFn: () => Promise<T>; enabled?: boolean; retry?: number; staleTime?: number; placeholderData?: unknown };
type QueryState<T> = { data: T | undefined; error: unknown; isPending: boolean; isSuccess: boolean; isError: boolean; isFetching: boolean; refetch: () => Promise<void> };
type MutationOptions<T, V> = { mutationFn: (variables: V) => Promise<T>; onSuccess?: (data: T, variables: V) => void | Promise<void> };

const subscribers = new Set<(key?: Key, clear?: boolean) => void>();
const matches = (key: Key, prefix?: Key) => !prefix || prefix.every((value, index) => key[index] === value);

/** Fetch-backed data hook. Requests are issued by fetch through apiModel query functions. */
export function useFetchQuery<T>(options: QueryOptions<T>): QueryState<T> {
  const key = JSON.stringify(options.queryKey);
  const queryFn = useRef(options.queryFn);
  queryFn.current = options.queryFn;
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>();
  const [isPending, setPending] = useState(true);
  const [isFetching, setFetching] = useState(false);
  const run = useCallback(async () => {
    if (options.enabled === false) { setPending(true); return; }
    setFetching(true); setError(undefined);
    try { setData(await queryFn.current()); setPending(false); }
    catch (cause) { setError(cause); setPending(false); }
    finally { setFetching(false); }
  }, [key, options.enabled]);
  useEffect(() => { if (options.enabled !== false) void run(); else setPending(true); }, [run, options.enabled]);
  useEffect(() => {
    const listener = (changed?: Key, clear?: boolean) => {
      if (clear) { setData(undefined); setError(undefined); setPending(true); }
      if (clear || matches(options.queryKey, changed)) void run();
    };
    subscribers.add(listener);
    return () => { subscribers.delete(listener); };
  }, [key, run]);
  return { data, error, isPending, isSuccess: !isPending && !error, isError: !!error, isFetching, refetch: run };
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
  queryFns.current = queries.map((query) => query.queryFn);
  const [states, setStates] = useState<QueryState<T>[]>([]);
  const load = useCallback(async () => {
    setStates((previous) => queryFns.current.map((_, index) => ({ data: previous[index]?.data, error: undefined, isPending: true, isSuccess: false, isError: false, isFetching: true, refetch: async () => {} })));
    const next = await Promise.all(queryFns.current.map(async (queryFn) => {
      try { return { data: await queryFn(), error: undefined, isPending: false, isSuccess: true, isError: false, isFetching: false, refetch: async () => {} }; }
      catch (error) { return { data: undefined, error, isPending: false, isSuccess: false, isError: true, isFetching: false, refetch: async () => {} }; }
    }));
    setStates(next);
  }, [key]);
  useEffect(() => { void load(); }, [load]);
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

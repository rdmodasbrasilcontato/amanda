'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseApiDataOptions<T> {
  fallback: T;
  params?: Record<string, string | number>;
}

export function useApiData<T>(
  endpoint: string,
  { fallback, params }: UseApiDataOptions<T>
) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(endpoint, window.location.origin);
      if (params) {
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message ?? 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [endpoint, JSON.stringify(params)]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

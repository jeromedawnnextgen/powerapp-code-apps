/**
 * useConnector<T>
 * 
 * Generic reusable hook for wrapping Power Apps connector service calls
 * with standardized loading, error, and data state management.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useConnector(
 *     () => Office365UsersService.MyProfile_V2("id,displayName"),
 *     []
 *   );
 */

import { useState, useEffect, useCallback, DependencyList } from 'react';

interface ConnectorState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useConnector<T>(
  fetchFn: () => Promise<{ data: T }>,
  deps: DependencyList = []
): ConnectorState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
}

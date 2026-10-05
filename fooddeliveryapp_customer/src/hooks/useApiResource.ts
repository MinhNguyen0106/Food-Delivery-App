import { useCallback, useEffect, useState } from 'react';

interface ResourceState<T> {
  load: () => Promise<T>;
  attempt: number;
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

export function useApiResource<T>(load: () => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ResourceState<T>>({
    load,
    attempt,
    data: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    let isCurrent = true;

    load()
      .then((data) => {
        if (isCurrent) {
          setState({ load, attempt, data, error: null, isLoading: false });
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setState({
            load,
            attempt,
            data: null,
            error: error instanceof Error ? error.message : 'Không thể tải dữ liệu.',
            isLoading: false,
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [attempt, load]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);
  const isCurrentRequest = state.load === load && state.attempt === attempt;
  return {
    data: isCurrentRequest ? state.data : null,
    error: isCurrentRequest ? state.error : null,
    isLoading: !isCurrentRequest || state.isLoading,
    retry,
  };
}

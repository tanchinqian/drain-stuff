import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelection } from './state';
export function useWrite<T>(
  mutationFn: (input: T) => Promise<unknown>,
  message: string | ((input: T) => string),
) {
  const client = useQueryClient();
  const notify = useSelection((s) => s.notify);
  return useMutation({
    mutationFn,
    onSuccess: (_data, input) => {
      void client.invalidateQueries();
      const saved =
        (typeof message === 'function' ? message(input) : message) +
        ' · ' +
        new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
      notify(saved);
    },
    onError: (error: Error) => notify(error.message),
  });
}

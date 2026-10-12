import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelection } from './state';
export function useWrite<T>(mutationFn: (input: T) => Promise<unknown>, message: string) {
  const client = useQueryClient();
  const notify = useSelection((s) => s.notify);
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void client.invalidateQueries();
      notify(message);
    },
    onError: (error: Error) => notify(error.message),
  });
}

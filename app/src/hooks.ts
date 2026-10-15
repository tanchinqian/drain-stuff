import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActivity, useSelection } from './state';
export function useWrite<T>(mutationFn: (input: T) => Promise<unknown>, message: string) {
  const client = useQueryClient();
  const notify = useSelection((s) => s.notify);
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void client.invalidateQueries();
      const saved =
        message +
        ' · ' +
        new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
      notify(saved);
      useActivity.getState().record(message);
    },
    onError: (error: Error) => notify(error.message),
  });
}

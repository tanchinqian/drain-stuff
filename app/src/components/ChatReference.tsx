import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import Drawer from './Drawer';
import type { FaultChatSource } from '../../../shared/src/faultChat';
import { stepLibrary } from '../../../shared/src/diagnosis';

export default function ChatReference({ source, onClose }: {source: FaultChatSource; onClose: () => void}) {
  const query = useQuery({
    queryKey: ['chat-reference', source.kind, source.id],
    queryFn: async () => {
      const records = source.kind === 'case' ? await api.cases() : await api.guidance();
      return records.find(record => record.id === source.id) ?? null;
    },
  });
  const record = query.data;
  return <Drawer title={source.label} onClose={onClose}>
    {query.isPending && <p role="status">Loading reference...</p>}
    {query.error && <p role="alert">{query.error.message}</p>}
    {query.isSuccess && !record && <p>This reference is no longer available.</p>}
    {record && <>
      {'symptoms' in record ? <>
        <p className="notice">{/guidance-based/i.test(record.sourceLabel) ? 'Guidance-based example; no verified field repair outcome.' : record.sourceLabel}</p>
        <h3>Symptoms</h3><p>{record.symptoms}</p>
        <h3>Cause recorded in this case</h3><p>{record.cause}</p>
        <h3>Steps</h3><ol>{record.stepsTaken.map(id => <li key={id}>{stepLibrary[id] ?? id}</li>)}</ol>
        <h3>Outcome</h3><p>{record.outcome}</p>
        <p className="small">Asset type: {record.assetType} / Part: {record.part}</p>
      </> : <><h3>{record.title}</h3><p>{record.passage}</p></>}
      {/^https:\/\//i.test(record.sourceUrl) ? <a href={record.sourceUrl} target="_blank" rel="noreferrer">Open original source</a> : <p className="small">Recorded operator case</p>}
    </>}
  </Drawer>;
}

import type { Fault, FaultRule } from '../api/types';
import { displayName } from '../utils';
import { partName } from '../api/modelCatalog';
import DataTable from './DataTable';
import Chip from './Chip';
import Timestamp from './Timestamp';

export default function FaultTableRegister({
  rows,
  rules,
  onSelect,
  onRule,
}: {
  rows: Fault[];
  rules: FaultRule[];
  onSelect: (fault: Fault) => void;
  onRule: (id: string) => void;
}) {
  return (
    <DataTable
      id="faults"
      rows={rows}
      rowId={(f) => f.id}
      onSelect={onSelect}
      filters={[
        { key: 'zone', label: 'Zone', value: (f) => f.zone },
        { key: 'type', label: 'Fault class', value: (f) => displayName(f.type) },
        { key: 'status', label: 'Status', value: (f) => f.status },
      ]}
      columns={[
        { key: 'id', label: 'ID', width: '7%', value: (f) => f.id },
        { key: 'title', label: 'Title', width: '18%', value: (f) => displayName(f.type) },
        { key: 'asset', label: 'Asset', width: '6%', value: (f) => f.featureId },
        { key: 'part', label: 'Part', width: '16%', value: (f) => partName(f.partId) },
        {
          key: 'severity',
          width: '9%',
          label: 'Severity',
          value: (f) => f.severity,
          render: (f) => (
            <Chip value={f.severity === 3 ? 'High' : f.severity === 2 ? 'Medium' : 'Low'} />
          ),
        },
        {
          key: 'opened',
          width: '16%',
          label: 'Opened',
          value: (f) => f.openedAt,
          render: (f) => <Timestamp value={f.openedAt} />,
        },
        {
          key: 'status',
          width: '11%',
          label: 'Status',
          value: (f) => f.status,
          render: (f) => (
            <button onClick={() => onSelect(f)}>
              {displayName(f.workOrder?.state ?? 'detected')}
            </button>
          ),
        },
        {
          key: 'rule',
          width: '17%',
          label: 'Rule',
          value: (f) => rules?.find((r) => r.id === f.ruleId)?.label ?? 'Manual report',
          render: (f) => (
            <button
              className="text-link"
              title={
                (rules?.find((r) => r.id === f.ruleId)?.label ?? 'Manual report') + ' · ' + f.ruleId
              }
              disabled={f.ruleId === 'MANUAL'}
              onClick={() => onRule(f.ruleId)}
            >
              {rules?.find((r) => r.id === f.ruleId)?.label ?? 'Manual report'}
            </button>
          ),
        },
      ]}
    />
  );
}

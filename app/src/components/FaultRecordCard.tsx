import type { Fault, FaultRule } from '../api/types';
import { displayName } from '../utils';
import { partName } from '../api/modelCatalog';
import Chip from './Chip';
import Timestamp from './Timestamp';

export default function FaultRecordCard({
  fault,
  rule,
  onSelect,
  onRule,
}: {
  fault: Fault;
  rule?: FaultRule;
  onSelect: (fault: Fault) => void;
  onRule: (id: string) => void;
}) {
  const severity = fault.severity === 3 ? 'High' : fault.severity === 2 ? 'Medium' : 'Low';
  return (
    <article className="fault-record-card" data-fault-id={fault.id}>
      <div className="panel-heading">
        <h3>
          <button className="text-link" onClick={() => onSelect(fault)}>
            {fault.id} · {displayName(fault.type)}
          </button>
        </h3>
        <Chip value={severity} />
      </div>
      <dl className="fault-record-fields">
        <div>
          <dt>Asset</dt>
          <dd>{fault.featureId}</dd>
        </div>
        <div>
          <dt>Part</dt>
          <dd>{partName(fault.partId)}</dd>
        </div>
        <div>
          <dt>Zone</dt>
          <dd>{fault.zone}</dd>
        </div>
        <div>
          <dt>Opened</dt>
          <dd>
            <Timestamp value={fault.openedAt} />
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{displayName(fault.status)}</dd>
        </div>
        <div>
          <dt>Work order</dt>
          <dd>
            {displayName(
              fault.workOrder?.state ?? (fault.status === 'closed' ? 'closed' : 'detected'),
            )}
          </dd>
        </div>
        <div className="fault-record-rule">
          <dt>Rule</dt>
          <dd>
            {rule ? (
              <button className="text-link" title={rule.id} onClick={() => onRule(rule.id)}>
                {rule.label}
              </button>
            ) : fault.ruleId === 'MANUAL' ? (
              'Manual report'
            ) : (
              fault.ruleId
            )}
          </dd>
        </div>
      </dl>
      <button className="button" onClick={() => onSelect(fault)}>
        View {fault.id} details
      </button>
    </article>
  );
}

import {Link} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {api} from '../api/client';
import {QueryState} from '../components/QueryState';
import TrialComparison from '../components/TrialComparison';
export default function Materials(){
 const q=useQuery({queryKey:['materials'],queryFn:async()=>{const [trials,batches,config]=await Promise.all([api.trials(),api.batches(),api.config()]);return {trials,batches,config};}});
 return <QueryState loading={q.isPending} error={q.error}><div className="page-heading"><h1>Materials and trial</h1></div><p>Compost for filter socks and mulch is released only through the maturity checks. Any soil benefit is a hypothesis under the trial; loosening may account for most of a measured change.</p>
 {q.data&&<><section className="panel"><div className="panel-heading"><h2>Material batches</h2><Link className="button" to="/batches">Open batch records</Link></div><div className="table-scroll"><table><thead><tr><th>Batch</th><th>Maturity gate</th><th>Allocated sites</th></tr></thead><tbody>{q.data.batches.map(b=><tr key={b.id}><td><Link to={'/batches?batch='+b.id}>{b.id}</Link></td><td>{b.maturityGate}{b.gateReason?' · '+b.gateReason:''}</td><td>{q.data!.trials.filter(t=>t.batchId===b.id).map(t=>t.featureId+' · '+(t.doseLabel??'Dose not recorded')).join(', ')||'None recorded'}</td></tr>)}</tbody></table></div></section><section className="panel"><div className="panel-heading"><h2>Three-arm field trial</h2><Link className="button" to="/trials">Record tests and safety checks</Link></div><p>Untreated, loosened, and loosened plus compost are shown in protocol order. Compare the same marked points, method and repeat counts. No outcome is inferred from the treatment label.</p><TrialComparison trials={q.data.trials} config={q.data.config}/></section></>}
 </QueryState>;
}

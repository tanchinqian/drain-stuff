import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Suggestion, DiagnosisRequest } from '../../../shared/src/contract';
import { stepLibrary } from '../../../shared/src/diagnosis';
export default function DiagnosisPanel({ faultId, partContext, inline = false }: {
  faultId: string; partContext?: DiagnosisRequest['partContext']; inline?: boolean;
}) {
  const info = useQuery({queryKey: ['ai-config'], queryFn: api.aiInfo});
  const [capturedSecond, setCapturedSecond] = useState<number>();
  const [result, setResult] = useState<Suggestion | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [editing, setEditing] = useState(false),
    [ids, setIds] = useState<string[]>([]),
    [search, setSearch] = useState(''),
    [note, setNote] = useState(''),
    [saved, setSaved] = useState('');
  async function generate() {
    setBusy(true);
    setError('');
    setSaved('');
    try {
      const r = await api.diagnose(faultId, partContext);
      setResult(r);
      setCapturedSecond(partContext?.model?.second);
      setIds(r.rankedStepIds);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function feedback(choice: 'accept' | 'edit' | 'reject') {
    setBusy(true);
    setError('');
    try {
      await api.diagnosisFeedback({
        suggestionId: result!.id,
        choice,
        note,
        ...(choice === 'edit' ? { rankedStepIds: ids } : {}),
      });
      setSaved('Recorded: ' + choice);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="diagnosis-panel" aria-label={inline ? 'Selected part AI diagnosis' : 'Suggested diagnosis'}>
      <div className="panel-heading">
        <h3>{inline ? 'AI diagnosis' : 'Suggested diagnosis'}</h3>
        <button disabled={busy} onClick={generate}>
          {busy ? 'Analysing…' : result ? 'Refresh analysis' : inline ? 'Analyse this part' : 'Retrieve suggestion'}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {!result && (
        <p className="small">
          {inline ? 'Explain the recorded finding using this part, its readings, the current storm snapshot and general model knowledge.'
            : 'Compare this fault with sourced cases and guidance. Suggestions do not confirm faults or assign work.'}
        </p>
      )}
      {inline && !result && <p className="small">{info.data?.model
        ? `Model: ${info.data.model}${info.data.configured ? '' : ' · Connection not configured; case matching will be used.'}`
        : 'Case matching is available. Start the local backend to use its configured model.'}</p>}
      {result && (
        <>
          <p className="takeaway">{result.draftBanner}</p>
          <p>
            <strong>
              {result.insufficientInformation ? 'Not enough information' : result.diagnosis}
            </strong>
          </p>
          {result.insufficientInformation && <p>{result.diagnosis}</p>}
          <p className="small">
            Confidence: {result.confidence} · {result.mode}
          </p>
          {result.provider && <p className="small" role="status">
            {result.provider.fallback
              ? `Fallback · case matching. ${result.provider.reason?.replaceAll('_', ' ') ?? 'Model unavailable'}.`
              : `Model: ${result.provider.model} · General knowledge and supplied context`}
          </p>}
          {capturedSecond !== undefined && <p className="small">Simulation snapshot: minute {(capturedSecond / 60).toFixed(1)}. Simulation outputs are separate from recorded observations.</p>}
          {result.analysis && <>
            <h4>Possible causes · unconfirmed</h4>
            {result.analysis.possibleCauses.map((cause, index) => <div className="diagnosis-cause" key={index}>
              <strong>{cause.cause}</strong><p>{cause.reasoning}</p>
            </div>)}
            {!!result.analysis.missingInformation.length && <><h4>Information needed</h4><ul>{result.analysis.missingInformation.map((item, i) => <li key={i}>{item}</li>)}</ul></>}
            {!!result.analysis.checks.length && <><h4>Suggested checks</h4><ul>{result.analysis.checks.map((item, i) => <li key={i}>{item}</li>)}</ul></>}
          </>}
          <ol>
            {result.rankedStepIds.map((id) => (
              <li key={id}>{stepLibrary[id]}</li>
            ))}
          </ol>
          <h4>Retrieved evidence</h4>
          {!result.citedCaseIds.length && !result.citedGuidanceIds.length && <p className="small">No retrieved source supports this explanation. General model knowledge is not a site observation.</p>}
          {result.sources
            .filter(
              (s) => result.citedCaseIds.includes(s.id) || result.citedGuidanceIds.includes(s.id),
            )
            .map((s) => (
              <details key={s.id}>
                <summary>
                  {s.id} · {'sourceLabel' in s ? s.sourceLabel : s.title}
                </summary>
                <p>{'cause' in s ? s.symptoms + ' ' + s.outcome : s.passage}</p>
                {s.sourceUrl.startsWith('https://') ? (
                  <a href={s.sourceUrl} target="_blank" rel="noreferrer">
                    Open source
                  </a>
                ) : (
                  <p className="small">Source: recorded operator case</p>
                )}
              </details>
            ))}
          <details>
            <summary>How this was produced</summary>
            <p>{result.notes}</p>
            <p className="small">
              Prompt {result.promptVersion} · {result.mode}. Case/guidance text is evidence, not
              instructions. Steps are unchanged draft library entries.
            </p>
          </details>
          <label className="field">
            Review note
            <textarea value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
          </label>
          {editing && (
            <fieldset>
              <legend>Edit selected library steps</legend>
              <input
                aria-label="Search draft steps"
                placeholder="Search draft steps"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="draft-step-options">
                {Object.entries(stepLibrary)
                  .filter(([id, text]) =>
                    (id + ' ' + text).toLowerCase().includes(search.toLowerCase()),
                  )
                  .map(([id, text]) => (
                    <label key={id}>
                      <input
                        type="checkbox"
                        checked={ids.includes(id)}
                        onChange={(e) =>
                          setIds(e.target.checked ? [...ids, id] : ids.filter((v) => v !== id))
                        }
                      />
                      {text}
                    </label>
                  ))}
              </div>
              <ol>
                {ids.map((id, i) => (
                  <li key={id}>
                    {id}{' '}
                    <button
                      type="button"
                      disabled={!i}
                      onClick={() => {
                        const next = [...ids];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        setIds(next);
                      }}
                    >
                      Move up
                    </button>
                  </li>
                ))}
              </ol>
            </fieldset>
          )}
          <div className="actions">
            <button disabled={busy || !!saved} onClick={() => feedback('accept')}>
              Accept
            </button>
            <button
              disabled={busy || !!saved}
              onClick={() => (editing ? feedback('edit') : setEditing(true))}
            >
              {editing ? 'Save edited steps' : 'Edit'}
            </button>
            <button disabled={busy || !!saved} onClick={() => feedback('reject')}>
              Reject
            </button>
          </div>
          {saved && <p role="status">{saved} in the audit log.</p>}
        </>
      )}
    </section>
  );
}

import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MessageCircle, Send, X } from 'lucide-react';
import { api } from '../api/client';
import type { FaultChatAnswer, FaultChatSource } from '../../../shared/src/faultChat';

type Message = { role: 'user' | 'assistant'; content: string; result?: FaultChatAnswer };
export default function FaultChatbot({
  assetId,
  faultId,
  partId,
  onSource,
}: {
  assetId?: string;
  faultId?: string;
  partId?: string;
  onSource: (source: FaultChatSource) => void;
}) {
  const [open, setOpen] = useState(false),
    [input, setInput] = useState(''),
    [messages, setMessages] = useState<Message[]>([]),
    [pending, setPending] = useState<string | null>(null),
    [error, setError] = useState('');
  const log = useRef<HTMLDivElement>(null),
    composer = useRef<HTMLTextAreaElement>(null),
    sending = useRef(false);
  const id = useId();
  const [diagnosis, setDiagnosis] = useState<{id?: string; faultId: string; partId?: string} | null>(null);
  const diagnosisMatches = diagnosis?.partId === partId && diagnosis?.faultId === faultId;
  useEffect(() => {
    const followUp = (event: Event) => {
      const detail = (event as CustomEvent<{assetId: string; faultId: string; partId?: string; diagnosisId?: string}>).detail;
      if (detail.assetId !== assetId) return;
      setDiagnosis({ id: detail.diagnosisId, faultId: detail.faultId, partId: detail.partId });
      setOpen(true);
      composer.current?.focus({ preventScroll: true });
    };
    window.addEventListener('fault-chat-follow-up', followUp);
    return () => window.removeEventListener('fault-chat-follow-up', followUp);
  }, [assetId]);
  const status = useQuery({
    queryKey: ['fault-chat-status'],
    queryFn: api.faultChatStatus,
    enabled: open,
    staleTime: 15000,
    retry: false,
  });
  useEffect(() => {
    if (open) composer.current?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, pending, open]);
  const send = async (question = input) => {
    const content = question.trim();
    if (!content || sending.current || !status.data?.available) return;
    sending.current = true;
    setPending(content);
    setInput('');
    setError('');
    const user: Message = { role: 'user', content };
    try {
      const result = await api.faultChat({
        messages: [...messages.slice(-10), user].map((message) => ({
          role: message.role,
          content: message.content,
        })),
        assetId,
        faultId,
        partId,
        diagnosisId: diagnosisMatches ? diagnosis?.id : undefined,
      });
      setMessages((previous) => [
        ...previous,
        user,
        { role: 'assistant', content: result.answer, result },
      ]);
    } catch (reason) {
      setInput(content);
      setError(
        reason instanceof Error ? reason.message : 'The assistant could not answer. Try again.',
      );
    } finally {
      sending.current = false;
      setPending(null);
    }
  };
  return (
    <>
      {open && (
        <section
          id={id}
          className="fault-chat-window"
          role="dialog"
          aria-modal="false"
          aria-labelledby={id + '-heading'}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              setOpen(false);
            }
          }}
        >
          <header className="fault-chat-header">
            <div>
              <h2 id={id + '-heading'}>Fault assistant</h2>
              <p>Local Ollama · diagnosis, repairs and past cases</p>
            </div>
            <button aria-label="Close fault assistant" onClick={() => setOpen(false)}>
              <X size={18} aria-hidden="true" />
            </button>
          </header>
          <div className="fault-chat-scope">
            <span>
              {faultId
                ? `Selected fault: ${faultId}`
                : assetId
                  ? `Selected asset: ${assetId}`
                  : 'All faults and sensors'}
              {partId ? ` / Part: ${partId}` : ''}
            </span>
            <button
              className="text-action"
              disabled={pending !== null || !messages.length}
              onClick={() => {
                setMessages([]);
                setError('');
                setInput('');
              }}
            >
              New chat
            </button>
          </div>
          <div
            className="fault-chat-log"
            ref={log}
            role="log"
            aria-label="Fault chat messages"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {!messages.length && !pending && (
              <div className="fault-chat-intro">
                <p>
                  Ask about this diagnosis, how to fix a problem, or similar past cases.
                </p>
                <p className="small">
                  Answers combine saved evidence, case references and clearly labelled general guidance.
                </p>
                <div className="fault-chat-prompts">
                  {[
                    assetId
                      ? `What sensor and fault issues are recorded for ${assetId}?`
                      : 'Which sensors need attention?',
                    'How should I fix this, and what should I check afterwards?',
                    'Show me similar past cases and their outcomes.',
                  ].map((question) => (
                    <button
                      key={question}
                      disabled={!status.data?.available}
                      onClick={() => {
                        void send(question);
                      }}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <article
                key={index}
                className={'fault-chat-message ' + message.role}
                aria-label={message.role === 'user' ? 'Your question' : 'Assistant answer'}
              >
                <strong>{message.role === 'user' ? 'You' : 'Fault assistant'}</strong>
                <p>{message.content}</p>
                {message.result && (
                  <>
                    <div className="fault-chat-sources" aria-label="Answer sources">
                      {message.result.sources.map((source) =>
                        source.kind === 'sensor' ? (
                          <Link
                            key={source.id}
                            title={source.label}
                            to={'/sensors?sensor=' + encodeURIComponent(source.id)}
                          >
                            {source.id}
                          </Link>
                        ) : (
                          <button
                            key={source.id}
                            title={source.label}
                            onClick={() => onSource(source)}
                          >
                            {source.id}
                          </button>
                        ),
                      )}
                    </div>
                    <p className="small">
                      Records checked{' '}
                      {new Date(message.result.contextAt).toLocaleTimeString('en-MY', {
                        timeZone: 'Asia/Kuala_Lumpur',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}{' '}
                      MYT
                      {message.result.context.assetId ? ` · ${message.result.context.assetId}` : ''}
                    </p>
                  </>
                )}
              </article>
            ))}
            {pending && (
              <>
                <article className="fault-chat-message user">
                  <strong>You</strong>
                  <p>{pending}</p>
                </article>
                <p role="status" className="small">
                  Chatbot is responding…
                </p>
              </>
            )}
          </div>
          <div className="fault-chat-connection">
            {status.isPending ? (
              <p role="status">Connecting to local Ollama…</p>
            ) : status.isError || !status.data?.available ? (
              <>
                <p role="status">{status.data?.message ?? 'Could not connect to the assistant.'}</p>
                <button
                  onClick={() => {
                    void status.refetch();
                  }}
                >
                  Retry connection
                </button>
              </>
            ) : (
              <span>Local Ollama is ready</span>
            )}
          </div>
          <form
            className="fault-chat-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            {error && <p role="alert">{error}</p>}
            <label className="sr-only" htmlFor={id + '-question'}>
              Question about faults and sensors
            </label>
            <textarea
              id={id + '-question'}
              ref={composer}
              value={input}
              maxLength={2000}
              rows={2}
              placeholder="Ask about a fault or sensor…"
              disabled={pending !== null}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
            <button
              type="submit"
              aria-label="Send question"
              disabled={!input.trim() || pending !== null || !status.data?.available}
            >
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
        </section>
      )}
      <button
        className="fault-chat-launcher"
        aria-label={open ? 'Minimize fault assistant' : 'Open fault assistant'}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <MessageCircle size={21} aria-hidden="true" />
        <span>Ask about faults</span>
      </button>
    </>
  );
}

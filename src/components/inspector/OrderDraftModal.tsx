import { useEffect, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import type { InspectResult, RankedAction } from '../../types';
import { buildOrderDraft } from '../../lib/narrative';

export default function OrderDraftModal({
  action,
  inspect,
  placeName,
  onClose,
}: {
  action: RankedAction;
  inspect: InspectResult;
  placeName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const draft = buildOrderDraft(action, inspect, placeName);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Draft directive"
    >
      <div
        className="flex max-h-[84vh] w-[620px] max-w-[92vw] flex-col rounded border border-line-strong bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-display text-xs font-semibold text-primary">Draft directive</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(draft);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
              className="flex items-center gap-1.5 rounded border border-line px-2.5 py-1 text-[10px] text-secondary hover:text-primary"
            >
              {copied ? <Check size={11} className="text-aqi-good" /> : <Copy size={11} />}
              {copied ? 'copied' : 'copy'}
            </button>
            <button onClick={onClose} aria-label="Close" className="rounded p-1 text-muted hover:text-primary">
              <X size={15} />
            </button>
          </div>
        </div>
        <pre className="overflow-y-auto whitespace-pre-wrap px-5 py-4 font-mono text-[11px] leading-relaxed text-primary">
          {draft}
        </pre>
      </div>
    </div>
  );
}

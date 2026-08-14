import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Copy } from 'lucide-react';
import { copyReferenceNumber } from '../utils/recordReferences';

type CopyState = 'idle' | 'copied' | 'failed';

interface ReferenceCopyButtonProps {
  referenceNumber: string;
  recordType: 'دين' | 'فاتورة';
}

/** زر صغير ينسخ الرقم الخام القابل للبحث، مع إشارة حالة لا تعتمد على إشعارات عامة. */
export default function ReferenceCopyButton({ referenceNumber, recordType }: ReferenceCopyButtonProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const handleCopy = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (resetTimer.current) clearTimeout(resetTimer.current);

    const copied = await copyReferenceNumber(referenceNumber);
    setCopyState(copied ? 'copied' : 'failed');
    resetTimer.current = setTimeout(() => setCopyState('idle'), 2200);
  };

  const label = copyState === 'copied'
    ? `تم نسخ رقم ${recordType}`
    : copyState === 'failed'
      ? `تعذر نسخ رقم ${recordType}`
      : `نسخ رقم ${recordType} ${referenceNumber}`;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-1 ${
        copyState === 'copied'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
          : copyState === 'failed'
            ? 'border-rose-200 bg-rose-50 text-rose-600'
            : 'border-slate-200 bg-white text-slate-400 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600'
      }`}
      aria-label={label}
      title={label}
    >
      {copyState === 'copied' ? (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      ) : copyState === 'failed' ? (
        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span className="sr-only" aria-live="polite">{label}</span>
    </button>
  );
}

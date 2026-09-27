// Copy a link to the current view. Over file:// the URL is a path on this computer, so it is shown, not copied.
import { useEffect, useRef, useState } from 'react';
import { ANALYSIS_COPY as C } from '../../lib/analysis/copy';
import { canCopy, shareUrl } from '../../lib/analysis/link';
import { UI } from '../../lib/copy';
import { useApp } from '../../lib/store';
import { cx } from '../../lib/format';

const protocol = () => {
  try {
    return location.protocol;
  } catch {
    return '';
  }
};

export default function CopyLink({ className }: { className?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'show'>('idle');
  const [url, setUrl] = useState('');
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const onClick = async () => {
    const u = shareUrl(useApp.getState());
    setUrl(u);
    if (!canCopy(protocol()) || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return setState('show');
    try {
      await navigator.clipboard.writeText(u);
      setState('copied');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setState('idle'), 1600);
    } catch {
      setState('show');
    }
  };
  return (
    <div className={className}>
      <button type="button" onClick={onClick} aria-live="polite" className={cx('w-full rounded-xl px-3 py-2 text-small font-semibold ring-1 transition', state === 'copied' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-white text-slate-800 ring-stone-300 hover:ring-stone-400')}>
        {state === 'copied' ? UI.linkCopied : UI.copyLink}
      </button>
      {state === 'show' && (
        <div className="mt-1.5">
          <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Link to this view" className="w-full rounded-lg bg-stone-50 px-2 py-1.5 text-caption text-slate-800 ring-1 ring-stone-200 tnum" />
          <div className="mt-1 text-caption text-slate-600">{protocol() === 'file:' ? C.link.fileOnly : 'Copy the link above.'}</div>
        </div>
      )}
    </div>
  );
}

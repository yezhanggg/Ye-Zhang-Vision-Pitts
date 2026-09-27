import { useMemo } from 'react';
import { bundledGeo } from '../lib/explore/catalog';
import type { ChatScope } from '../lib/explore/chat';
import { resolveForLevel } from '../lib/explore/search';
import { useApp } from '../lib/store';
import ChatBox from './explore/ChatBox';

/**
 * The same question box as Explore, for the Analysis views: it searches the city's census tracts and answers
 * about the tract that is selected there, under the priorities set there. Match places it in its right column;
 * the compare views put it at the top of the left rail (`compact`: a pill until it is used, the rail's full width),
 * so it never covers map B. AnalysisView withholds any answer whose figures could not be checked.
 */
export default function AnalysisChat({ compact = false }: { compact?: boolean }) {
  const selectedId = useApp((s) => s.selectedId);
  const weights = useApp((s) => s.weights);
  const select = useApp((s) => s.select);
  const fc = useMemo(() => bundledGeo('tract'), []);
  const resolve = useMemo(() => resolveForLevel('tract', fc), [fc]);
  const scope = useMemo<ChatScope>(() => ({ level: 'tract', cityOnly: true, fc, selected: selectedId, variable: null, values: null, weights }), [fc, selectedId, weights]);
  const box = <ChatBox scope={scope} resolve={resolve} onGo={select} compact={compact} />;
  if (!compact) return box;
  return (
    <div className="[&>div]:ml-0 [&>div]:!max-w-none" data-testid="analysis-chat">
      {box}
    </div>
  );
}

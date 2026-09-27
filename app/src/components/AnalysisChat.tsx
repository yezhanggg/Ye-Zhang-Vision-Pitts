import { useMemo } from 'react';
import { bundledGeo } from '../lib/explore/catalog';
import type { ChatScope } from '../lib/explore/chat';
import { resolveForLevel } from '../lib/explore/search';
import { useApp } from '../lib/store';
import ChatBox from './explore/ChatBox';

/**
 * The same question box as Explore, for the Analysis views: it searches the city's census tracts and answers
 * about the tract that is selected there, under the priorities set there.
 */
export default function AnalysisChat({ compact = false }: { compact?: boolean }) {
  const selectedId = useApp((s) => s.selectedId);
  const weights = useApp((s) => s.weights);
  const select = useApp((s) => s.select);
  const fc = useMemo(() => bundledGeo('tract'), []);
  const resolve = useMemo(() => resolveForLevel('tract', fc), [fc]);
  const scope = useMemo<ChatScope>(() => ({ level: 'tract', cityOnly: true, fc, selected: selectedId, variable: null, values: null, weights }), [fc, selectedId, weights]);
  return <ChatBox scope={scope} resolve={resolve} onGo={select} compact={compact} />;
}

import { tractById, tractLabel } from '../../lib/data';

export const nameOf = (id: string) => tractLabel(tractById.get(id));

/** Unique neighborhood names for a list of tracts, the first `n`, then "and N more". */
export function namesOf(ids: string[], n = 8): string {
  const names = [...new Set(ids.map(nameOf))];
  if (!names.length) return 'none';
  return names.length <= n ? names.join(', ') : `${names.slice(0, n).join(', ')} and ${names.length - n} more`;
}

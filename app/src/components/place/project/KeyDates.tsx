// PHFA's next deadlines for the financing in use (data/lazy/lihtc_pa.json `dates`), with the date they were checked
// and whether they come from an adopted plan or the draft.
import { SHEET_FILE } from '../../../lib/lihtc/sheetState';
import type { Branch } from '../../../lib/pencil/inputs';
import { dateWords } from '../../../lib/project/stamp';
import { SourceLine } from '../shared';

export default function KeyDates({ branch }: { branch: Branch }) {
  const d = SHEET_FILE.dates;
  if (!d) return null;
  const items = branch === 'market' ? d.items : d.items.filter((i) => i.credit === branch);
  return (
    <div data-key-dates>
      <div className="text-small font-semibold text-slate-900">Next steps and key dates</div>
      <ul className="mt-1 space-y-1">
        {items.map((i) => (
          <li key={i.label} className="text-caption leading-snug text-slate-700">
            <span className="font-semibold text-slate-900 tnum">{i.date ? dateWords(i.date) : 'Rule'}</span> · {i.label}; {i.note} (
            <a href={i.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-violet-800">
              {i.ref}
            </a>
            )
          </li>
        ))}
      </ul>
      <SourceLine className="mt-1">
        Checked {dateWords(d.checked)}. {d.status}
      </SourceLine>
    </div>
  );
}

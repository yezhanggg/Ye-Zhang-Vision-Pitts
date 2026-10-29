// The right panel's line while Test a project waits for Confirm (lib/project/confirm). Online only: loaded on demand.
import type { ReactNode } from 'react';
import { useConfirmed } from '../../../lib/project/confirm';

/** Shows the line when the inputs are not confirmed, else the results (`children`). */
export default function ConfirmGate({ children }: { children: ReactNode }) {
  const { confirmed, ever } = useConfirmed();
  if (confirmed) return <>{children}</>;
  return (
    <p className="rounded-xl bg-violet-50 px-3 py-2 text-small leading-snug text-violet-800 ring-1 ring-violet-200" data-confirm-hint>
      {ever ? 'Inputs changed. Press Confirm changes at the bottom of the left panel to update the results.' : 'Set the project on the left, then press Confirm and test at the bottom to see the results here.'}
    </p>
  );
}

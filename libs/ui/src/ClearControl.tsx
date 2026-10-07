import type { ReactElement } from 'react';

/** Removes every Voice at once; the application only shows it when there is something to clear. */
export const ClearControl = ({ onClear }: { onClear(): void }): ReactElement => (
  <button className="clear" type="button" onClick={onClear}>
    Clear
  </button>
);

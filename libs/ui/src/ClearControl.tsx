import type { ReactElement } from 'react';

export interface ClearControlProps {
  /** True when the Pattern has no Voices, so there is nothing to clear. */
  readonly disabled: boolean;
  onClear(): void;
}

/** Removes every Voice at once; always shown, and disabled while there is nothing to clear. */
export const ClearControl = ({ disabled, onClear }: ClearControlProps): ReactElement => (
  <button className="clear" type="button" disabled={disabled} onClick={onClear}>
    Clear
  </button>
);

import type { ReactElement } from 'react';

/** The single line a first-time visitor sees; it fades out and stays out of the way. */
export const Hint = ({ visible }: { readonly visible: boolean }): ReactElement => (
  <p className="hint" data-visible={visible} aria-hidden={!visible}>
    Drag a dot onto the canvas
  </p>
);

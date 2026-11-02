import type { Example } from '@dotproducer/model';
import { Fragment, type ReactElement } from 'react';

export interface HintProps {
  /** "Drag a dot onto the canvas", for a first-time visitor. */
  readonly gestureVisible: boolean;
  /** "Try techno · breakbeat · shuffle", whenever the canvas is empty. */
  readonly examplesVisible: boolean;
  readonly examples: readonly Example[];
  onChoose(example: Example): void;
}

/** The lines an empty canvas shows; each fades out and stays out of the way. */
export const Hint = ({
  gestureVisible,
  examplesVisible,
  examples,
  onChoose,
}: HintProps): ReactElement => (
  <div className="hint">
    <p data-visible={gestureVisible} aria-hidden={!gestureVisible}>
      Drag a dot onto the canvas
    </p>
    <p data-visible={examplesVisible} aria-hidden={!examplesVisible} inert={!examplesVisible}>
      Try{' '}
      {examples.map((example, index) => (
        <Fragment key={example.name}>
          {index > 0 && ' · '}
          <a
            href={`#${example.encoded}`}
            onClick={(event) => {
              event.preventDefault();
              onChoose(example);
            }}
          >
            {example.name}
          </a>
        </Fragment>
      ))}
    </p>
  </div>
);

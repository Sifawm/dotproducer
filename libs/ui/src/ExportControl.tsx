import { AUDIO_FORMATS, type AudioFormat } from '@dotproducer/model';
import { useId, useRef, useState, type ReactElement } from 'react';

export interface ExportControlProps {
  /** True when the Pattern has no Voices, so there is nothing to export. */
  readonly disabled: boolean;
  /** Renders the Pattern in a format and downloads it; rejects when that fails. */
  onExport(format: AudioFormat): Promise<void>;
}

const FORMAT_NAMES: Readonly<Record<AudioFormat, string>> = { wav: 'WAV', mp3: 'MP3' };

/**
 * Exports the Pattern as an audio file, choosing the format in a modal dialog.
 * Always shown, and disabled while there is nothing to export.
 */
export const ExportControl = ({ disabled, onExport }: ExportControlProps): ReactElement => {
  const opener = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [format, setFormat] = useState<AudioFormat>(AUDIO_FORMATS[0]);
  const [rendering, setRendering] = useState(false);
  const [failed, setFailed] = useState(false);

  const open = (): void => {
    setFormat(AUDIO_FORMATS[0]);
    setFailed(false);
    dialog.current?.showModal();
  };

  const download = async (): Promise<void> => {
    setRendering(true);
    setFailed(false);
    try {
      await onExport(format);
      dialog.current?.close();
    } catch {
      setFailed(true);
    } finally {
      setRendering(false);
    }
  };

  return (
    <>
      <button ref={opener} className="export" type="button" disabled={disabled} onClick={open}>
        Export
      </button>
      <dialog
        ref={dialog}
        className="export-dialog"
        aria-labelledby={titleId}
        // A render cannot be called off: Escape waits for it, like Cancel.
        onCancel={(event) => rendering && event.preventDefault()}
        onClose={() => opener.current?.focus()}
      >
        <h2 id={titleId}>Export</h2>
        <fieldset>
          <legend>Format</legend>
          {AUDIO_FORMATS.map((each) => (
            <label key={each}>
              <input
                type="radio"
                name="format"
                value={each}
                checked={format === each}
                onChange={() => setFormat(each)}
              />
              {FORMAT_NAMES[each]}
            </label>
          ))}
        </fieldset>
        {failed && <p role="alert">Export failed. Try again.</p>}
        <div className="export-actions">
          <button type="button" disabled={rendering} onClick={() => dialog.current?.close()}>
            Cancel
          </button>
          <button type="button" disabled={rendering} onClick={() => void download()}>
            {rendering ? 'Rendering…' : 'Download'}
          </button>
        </div>
      </dialog>
    </>
  );
};

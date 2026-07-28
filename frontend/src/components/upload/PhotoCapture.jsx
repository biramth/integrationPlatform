import { useRef, useState } from 'react';
import Button from '../common/Button';

export default function PhotoCapture({ onCapture, submitting }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  function handleFileChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleSend() {
    if (!file) return;
    await onCapture(file);
    reset();
  }

  return (
    <div className="flex flex-col gap-3">
      {previewUrl ? (
        <div className="flex flex-col gap-3">
          <img src={previewUrl} alt="Aperçu bagage" className="max-h-72 w-full rounded-xl object-cover" />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={reset} className="flex-1">
              Reprendre
            </Button>
            <Button onClick={handleSend} disabled={submitting} className="flex-1">
              {submitting ? 'Envoi…' : 'Envoyer'}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => inputRef.current?.click()}
        >
          📷 Prendre une photo du bagage
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

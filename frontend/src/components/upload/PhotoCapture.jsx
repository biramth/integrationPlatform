import { useRef, useState } from 'react';
import { Camera, ShieldAlert } from 'lucide-react';
import Button from '../common/Button';

export default function PhotoCapture({ onCapture, submitting }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSensitive, setIsSensitive] = useState(false);
  const [sensitiveNote, setSensitiveNote] = useState('');

  function handleFileChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setIsSensitive(false);
    setSensitiveNote('');
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleSend() {
    if (!file) return;
    await onCapture(file, isSensitive, sensitiveNote.trim());
    reset();
  }

  return (
    <div className="flex flex-col gap-3">
      {previewUrl ? (
        <div className="flex flex-col gap-3">
          <img src={previewUrl} alt="Aperçu bagage" className="max-h-72 w-full rounded-xl object-cover" />

          <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm has-[:checked]:border-warning has-[:checked]:bg-warning-soft">
            <input
              type="checkbox"
              checked={isSensitive}
              onChange={(e) => setIsSensitive(e.target.checked)}
              className="h-4 w-4 accent-warning"
            />
            <ShieldAlert className={`h-4 w-4 ${isSensitive ? 'text-warning' : 'text-muted-foreground'}`} />
            Objet sensible à l'intérieur (espèces, électronique, papiers…)
          </label>

          {isSensitive && (
            <textarea
              placeholder="Précise quoi (ex: ordinateur portable, espèces, passeport…)"
              value={sensitiveNote}
              onChange={(e) => setSensitiveNote(e.target.value)}
              className="min-h-[70px] rounded-lg border border-border bg-card px-3 py-2 text-base text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          )}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={reset} className="flex-1">
              Reprendre
            </Button>
            <Button onClick={handleSend} loading={submitting} className="flex-1">
              Envoyer
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
          <Camera className="h-4 w-4" /> Photographier un bagage
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

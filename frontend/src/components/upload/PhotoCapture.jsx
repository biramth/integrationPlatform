import { useRef, useState } from 'react';
import { Camera, ShieldAlert } from 'lucide-react';
import Button from '../common/Button';

function compressImage(file, maxDimension = 1920, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressed);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = readerEvent.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export default function PhotoCapture({ onCapture, submitting }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSensitive, setIsSensitive] = useState(false);
  const [sensitiveNote, setSensitiveNote] = useState('');

  async function handleFileChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    try {
      setIsCompressing(true);
      const readyFile = await compressImage(selected);
      setFile(readyFile);
      setPreviewUrl(URL.createObjectURL(readyFile));
    } finally {
      setIsCompressing(false);
    }
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
              placeholder="Objet signalé (ex: ordinateur portable, espèces, passeport…)"
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
          loading={isCompressing}
        >
          <Camera className="h-4 w-4" /> {isCompressing ? 'Optimisation de la photo…' : 'Photographier un bagage'}
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

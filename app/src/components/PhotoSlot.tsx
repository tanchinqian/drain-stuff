import { useRef, useState } from 'react';
export default function PhotoSlot({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  const [error, setError] = useState('');
  const [filename, setFilename] = useState('');
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="photo-slot">
      <div className="field">
        <span>{label}</span>
        <button type="button" onClick={() => input.current?.click()}>
          Choose {label.toLowerCase()}
        </button>
        <span className="small">
          {filename || (value ? 'Saved image attached' : 'No image chosen')}
        </span>
        <input
          ref={input}
          hidden
          aria-label={label}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
              setError('Choose an image smaller than 2 MB.');
              return;
            }
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
              setError('Choose a PNG, JPEG or WebP image.');
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                onChange(reader.result);
                setError('');
                setFilename(file.name);
              }
            };
            reader.onerror = () => setError('The image could not be read. Choose it again.');
            reader.readAsDataURL(file);
          }}
        />
        <span className="field-note">Attachment saved with this record.</span>
      </div>
      {value && <img src={value} alt={label + ' attached to the record'} />}
      <p role={error ? 'alert' : undefined} className="error">
        {error}
      </p>
    </div>
  );
}

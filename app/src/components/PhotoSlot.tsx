import { useState } from 'react';
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
  return (
    <div className="photo-slot">
      <label className="field">
        {label}
        <input
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
              }
            };
            reader.readAsDataURL(file);
          }}
        />
        <span className="field-note">Demo attachment. Stored locally with synthetic records.</span>
      </label>
      {value && <img src={value} alt={label + ' attached to the synthetic record'} />}
      <p role={error ? 'alert' : undefined} className="error">
        {error}
      </p>
    </div>
  );
}

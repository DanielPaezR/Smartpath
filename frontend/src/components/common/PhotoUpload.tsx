// frontend/src/components/common/PhotoUpload.tsx
import React, { useRef } from 'react';

interface PhotoUploadProps {
  onPhotosChange: (photos: string[]) => void;
  existingPhotos?: string[];
  maxPhotos?: number;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ 
  onPhotosChange, 
  existingPhotos = [], 
  maxPhotos = 5 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newPhotos = Array.from(files).map(file => URL.createObjectURL(file));
      onPhotosChange([...existingPhotos, ...newPhotos].slice(0, maxPhotos));
    }
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = existingPhotos.filter((_, i) => i !== index);
    onPhotosChange(updatedPhotos);
  };

  return (
    <div style={{ marginTop: '10px' }}>
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '10px' }}>
        {existingPhotos.map((photo, index) => (
          <div key={index} style={{ position: 'relative' }}>
            <img 
              src={photo} 
              alt={`Evidencia ${index + 1}`} 
              style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '5px' }} 
            />
            <button
              onClick={() => removePhoto(index)}
              style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        ))}
        
        {existingPhotos.length < maxPhotos && (
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '80px',
              height: '80px',
              border: '2px dashed #ccc',
              borderRadius: '5px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              backgroundColor: 'transparent',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '24px' }}>📸</span>
            <span style={{ fontSize: '10px', marginTop: '5px' }}>Agregar</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        onChange={handlePhotoUpload}
        style={{ display: 'none' }}
      />
      
      <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
        {existingPhotos.length}/{maxPhotos} fotos
      </p>
    </div>
  );
};

// ✅ EXPORTACIÓN POR DEFECTO (IMPORTANTE)
export default PhotoUpload;
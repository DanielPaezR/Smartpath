// frontend/src/components/common/PhotoUpload.tsx
import React, { useState, useRef } from 'react';

interface PhotoUploadProps {
  onPhotosChange: (photos: string[]) => void;
  existingPhotos: string[];
  maxPhotos: number;
  enableCompression?: boolean;
  maxSizeMB?: number;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  onPhotosChange,
  existingPhotos,
  maxPhotos,
  enableCompression = false,
  maxSizeMB = 5
}) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Función para comprimir imagen
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Redimensionar imagen manteniendo aspecto
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let { width, height } = img;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convertir a base64 con calidad reducida
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (existingPhotos.length + files.length > maxPhotos) {
      alert(`Solo puedes subir máximo ${maxPhotos} fotos`);
      return;
    }

    setUploading(true);

    try {
      const newPhotos: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validar tamaño
        if (file.size > maxSizeMB * 1024 * 1024) {
          alert(`La imagen ${file.name} es muy grande. Máximo ${maxSizeMB}MB`);
          continue;
        }

        let photoBase64: string;

        if (enableCompression) {
          photoBase64 = await compressImage(file);
        } else {
          // Convertir a base64 sin compresión
          photoBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
        }

        newPhotos.push(photoBase64);
      }

      // Agregar nuevas fotos a las existentes
      const allPhotos = [...existingPhotos, ...newPhotos].slice(0, maxPhotos);
      onPhotosChange(allPhotos);

    } catch (error) {
      console.error('Error procesando imágenes:', error);
      alert('Error al procesar las imágenes');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = existingPhotos.filter((_, i) => i !== index);
    onPhotosChange(updatedPhotos);
  };

  return (
    <div style={{ marginTop: '10px' }}>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || existingPhotos.length >= maxPhotos}
        style={{
          padding: '8px 12px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          opacity: (uploading || existingPhotos.length >= maxPhotos) ? 0.6 : 1
        }}
      >
        {uploading ? '⏳ Subiendo...' : `📸 Agregar Fotos (${existingPhotos.length}/${maxPhotos})`}
      </button>

      {enableCompression && (
        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          ⚡ Compresión activada - Máx: {maxSizeMB}MB
        </div>
      )}

      {/* Vista previa de fotos */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
        {existingPhotos.map((photo, index) => (
          <div key={index} style={{ position: 'relative' }}>
            <img
              src={photo}
              alt={`Preview ${index + 1}`}
              style={{
                width: '80px',
                height: '80px',
                objectFit: 'cover',
                borderRadius: '4px',
                border: '1px solid #dee2e6'
              }}
            />
            <button
              onClick={() => removePhoto(index)}
              style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PhotoUpload;
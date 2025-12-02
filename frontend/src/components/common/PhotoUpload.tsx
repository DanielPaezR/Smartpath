// frontend/src/components/common/PhotoUpload.tsx - VERSIÓN CORREGIDA
import React, { useState, useRef, useEffect } from 'react';

interface PhotoUploadProps {
  onPhotosChange: (photos: string[]) => void;
  existingPhotos?: string[];
  maxPhotos?: number;
  enableCompression?: boolean;
  maxSizeMB?: number;
  disabled?: boolean; // 🆕 AÑADE ESTA LÍNEA
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  onPhotosChange,
  existingPhotos = [],
  maxPhotos = 5,
  enableCompression = false,
  maxSizeMB = 5,
  disabled = false // 🆕 VALOR POR DEFECTO
}) => {
  const [photos, setPhotos] = useState<string[]>(existingPhotos);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPhotos(existingPhotos);
  }, [existingPhotos]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return; // 🆕 NO HACER NADA SI ESTÁ DESHABILITADO
    
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > maxPhotos) {
      alert(`Solo puedes subir un máximo de ${maxPhotos} fotos`);
      return;
    }

    setUploading(true);
    const newPhotos: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validar tamaño
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`La foto ${file.name} excede el tamaño máximo de ${maxSizeMB}MB`);
        continue;
      }

      try {
        const photoDataUrl = await compressImageIfNeeded(file, enableCompression);
        newPhotos.push(photoDataUrl);
      } catch (error) {
        console.error('Error procesando imagen:', error);
        alert(`Error al procesar ${file.name}`);
      }
    }

    if (newPhotos.length > 0) {
      const updatedPhotos = [...photos, ...newPhotos];
      setPhotos(updatedPhotos);
      onPhotosChange(updatedPhotos);
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const compressImageIfNeeded = (file: File, compress: boolean): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (!compress || !e.target?.result) {
          resolve(e.target?.result as string);
          return;
        }

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Reducir tamaño si es muy grande
          let width = img.width;
          let height = img.height;
          const maxDimension = 1200;
          
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height * maxDimension) / width;
              width = maxDimension;
            } else {
              width = (width * maxDimension) / height;
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        
        img.onerror = reject;
        img.src = e.target.result as string;
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    if (disabled) return; // 🆕 NO PERMITIR SI ESTÁ DESHABILITADO
    
    const updatedPhotos = photos.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos);
  };

  return (
    <div className={`photo-upload-container ${disabled ? 'disabled' : ''}`}>
      <div className="photos-grid">
        {photos.map((photo, index) => (
          <div key={index} className="photo-preview">
            <img src={photo} alt={`Foto ${index + 1}`} />
            {!disabled && (
              <button 
                type="button" 
                className="remove-photo-btn"
                onClick={() => removePhoto(index)}
                disabled={uploading}
              >
                ×
              </button>
            )}
          </div>
        ))}
        
        {photos.length < maxPhotos && !disabled && (
          <div className="photo-upload-area">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={uploading || disabled}
              className="file-input"
            />
            <div className="upload-placeholder">
              {uploading ? (
                <div className="uploading-indicator">
                  <div className="spinner"></div>
                  <span>Subiendo...</span>
                </div>
              ) : (
                <>
                  <span className="upload-icon">📸</span>
                  <span className="upload-text">Agregar foto</span>
                  <span className="upload-hint">
                    Máx. {maxPhotos} fotos • {maxSizeMB}MB c/u
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="photo-stats">
        <span>{photos.length} / {maxPhotos} fotos</span>
        {enableCompression && (
          <span className="compression-badge">Comprimido</span>
        )}
      </div>
    </div>
  );
};

export default PhotoUpload;
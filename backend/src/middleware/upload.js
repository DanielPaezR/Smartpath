// backend/src/middleware/upload.js
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = 'uploads/photos/';
    if (file.fieldname === 'beforePhoto') {
      folder += 'before/';
    } else if (file.fieldname === 'afterPhoto') {
      folder += 'after/';
    } else if (file.fieldname === 'signature') {
      folder = 'uploads/signatures/';
    }
    cb(null, folder);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
  }
};

// Configurar multer con límites aumentados
export const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 20 * 1024 * 1024, // 20MB por archivo (aumentado de 10MB)
    files: 10 // máximo 10 archivos por petición
  },
  fileFilter: fileFilter
});

export const handlePhotoUpload = upload.fields([
  { name: 'beforePhoto', maxCount: 3 },  // Aumentado a 3 fotos por tipo
  { name: 'afterPhoto', maxCount: 3 },
  { name: 'signature', maxCount: 1 }
]);
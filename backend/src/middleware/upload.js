// backend/src/middleware/upload.js
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar almacenamiento
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
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes'));
  }
};

// Configurar multer
export const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter
});

// Middleware para manejar campos de archivos
export const handlePhotoUpload = upload.fields([
  { name: 'beforePhoto', maxCount: 1 },
  { name: 'afterPhoto', maxCount: 1 },
  { name: 'signature', maxCount: 1 }
]);
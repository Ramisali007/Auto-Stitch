const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { protect } = require('../middleware/authMiddleware');

// 1. Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. Set up Local Storage Engine for Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File type filter
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp|gif/;
  const ext = path.extname(file.originalname).toLowerCase();
  const isExtAllowed = allowedExtensions.test(ext);
  const isMimeAllowed = allowedExtensions.test(file.mimetype);

  if (isExtAllowed && isMimeAllowed) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, webp, gif) are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB size limit
  fileFilter: fileFilter
});

// Middleware wrapper to handle Multer errors for single file upload
const handleUploadSingle = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'File size exceeds 5MB limit' });
        }
        return res.status(400).json({ success: false, message: err.message });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// Middleware wrapper to handle Multer errors for multiple files upload
const handleUploadArray = (req, res, next) => {
  upload.array('images', 5)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'One or more files exceed 5MB limit' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ success: false, message: 'Too many files (limit: 5)' });
        }
        return res.status(400).json({ success: false, message: err.message });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// 3. Update endpoints to return the local URL
router.post('/', protect, handleUploadSingle, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  
  const serverUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    success: true,
    message: 'Image uploaded successfully',
    url: `${serverUrl}/uploads/${req.file.filename}`
  });
});

router.post('/multi', protect, handleUploadArray, (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'No files uploaded' });
  }
  
  const serverUrl = `${req.protocol}://${req.get('host')}`;
  const urls = req.files.map(file => `${serverUrl}/uploads/${file.filename}`);
  
  res.json({
    success: true,
    message: 'Images uploaded successfully',
    urls
  });
});

module.exports = router;

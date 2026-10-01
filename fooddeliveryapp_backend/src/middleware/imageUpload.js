const multer = require('multer');
const path = require('path');
const config = require('../config/uploads');
const AppError = require('../services/AppError');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxFileSizeBytes,
    files: config.maxFiles,
    fields: 0,
    parts: 1,
  },
  fileFilter(req, file, callback) {
    const filename = file.originalname || '';
    if (
      filename.length === 0 ||
      filename.length > 255 ||
      filename.includes('/') ||
      filename.includes('\\') ||
      /[\u0000-\u001f\u007f]/.test(filename)
    ) {
      return callback(new AppError('Image filename is invalid', 400, 'INVALID_IMAGE_FILENAME'));
    }
    const extension = path.extname(filename).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
      return callback(new AppError(
        'Image must use a .jpg, .jpeg, .png, or .webp extension',
        415,
        'INVALID_IMAGE_EXTENSION'
      ));
    }
    if (!Object.hasOwn(config.imageTypes, file.mimetype)) {
      return callback(new AppError('Image MIME type must be JPEG, PNG, or WEBP', 415, 'INVALID_IMAGE_MIME'));
    }
    return callback(null, true);
  },
}).single('image');

module.exports = function imageUpload(req, res, next) {
  if (!req.is('multipart/form-data')) {
    return next(new AppError('Content-Type must be multipart/form-data', 400, 'INVALID_UPLOAD'));
  }
  upload(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('Image exceeds the 5 MB limit', 413, 'IMAGE_TOO_LARGE'));
      }
      return next(new AppError('Invalid multipart image upload', 400, 'INVALID_UPLOAD'));
    }
    return next(error);
  });
};

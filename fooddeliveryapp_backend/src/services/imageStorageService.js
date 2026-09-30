const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const config = require('../config/uploads');
const AppError = require('./AppError');

function ensureContained(root, target) {
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    throw new AppError('Invalid upload path', 400, 'INVALID_UPLOAD_PATH');
  }
}

async function ensureUploadDirectory(entity) {
  const directory = path.resolve(config.uploadsRoot, entity);
  ensureContained(config.uploadsRoot, directory);
  await fs.mkdir(directory, { recursive: true });
  return directory;
}

function validateClientFilename(filename) {
  if (
    typeof filename !== 'string' ||
    filename.length === 0 ||
    filename.length > 255 ||
    filename.includes('/') ||
    filename.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(filename)
  ) {
    throw new AppError('Image filename is invalid', 400, 'INVALID_IMAGE_FILENAME');
  }
}

function validateSignature(buffer, mimeType) {
  const rule = config.imageTypes[mimeType];
  if (!rule || !Buffer.isBuffer(buffer) || buffer.length === 0) return false;
  if (rule.matches) return rule.matches(buffer);
  return rule.signatures.some((signature) =>
    buffer.length >= signature.length && buffer.subarray(0, signature.length).equals(signature)
  );
}

function validateImage(file) {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw new AppError('An image file is required', 400, 'IMAGE_REQUIRED');
  }
  validateClientFilename(file.originalname);
  if (file.buffer.length > config.maxFileSizeBytes) {
    throw new AppError('Image exceeds the 5 MB limit', 413, 'IMAGE_TOO_LARGE');
  }

  const extension = path.extname(file.originalname || '').toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
    throw new AppError('Image must use a .jpg, .jpeg, .png, or .webp extension', 415, 'INVALID_IMAGE_EXTENSION');
  }
  if (!config.imageTypes[file.mimetype]) {
    throw new AppError('Image MIME type must be JPEG, PNG, or WEBP', 415, 'INVALID_IMAGE_MIME');
  }
  const expectedExtension = config.imageTypes[file.mimetype].extension;
  if (extension !== expectedExtension && !(extension === '.jpeg' && expectedExtension === '.jpg')) {
    throw new AppError('Image extension does not match its MIME type', 415, 'IMAGE_TYPE_MISMATCH');
  }
  if (!validateSignature(file.buffer, file.mimetype)) {
    throw new AppError('Image content does not match its declared type', 415, 'INVALID_IMAGE_CONTENT');
  }
}

async function saveImage(entity, file) {
  validateImage(file);
  const directory = await ensureUploadDirectory(entity);
  const extension = config.imageTypes[file.mimetype].extension;
  const filename = `${Date.now()}-${randomUUID()}${extension}`;
  const absolutePath = path.resolve(directory, filename);
  ensureContained(config.uploadsRoot, absolutePath);
  await fs.writeFile(absolutePath, file.buffer, { flag: 'wx', mode: 0o644 });
  return {
    path: `${config.publicPrefix}/${entity}/${filename}`,
    absolutePath,
  };
}

function resolveStoredImage(imagePath, entity) {
  if (typeof imagePath !== 'string' || !imagePath.startsWith(`${config.publicPrefix}/${entity}/`)) {
    return null;
  }
  const filename = imagePath.slice(`${config.publicPrefix}/${entity}/`.length);
  if (!/^\d+-[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(filename)) return null;
  const absolutePath = path.resolve(config.uploadsRoot, entity, filename);
  try {
    ensureContained(config.uploadsRoot, absolutePath);
  } catch {
    return null;
  }
  return absolutePath;
}

async function deleteImage(imagePath, entity) {
  const absolutePath = resolveStoredImage(imagePath, entity);
  if (!absolutePath) return false;
  try {
    await fs.unlink(absolutePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

module.exports = {
  validateImage,
  validateSignature,
  saveImage,
  deleteImage,
};

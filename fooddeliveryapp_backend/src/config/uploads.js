const path = require('path');

const uploadsRoot = path.resolve(__dirname, '../../uploads');

module.exports = Object.freeze({
  uploadsRoot,
  maxFileSizeBytes: 5 * 1024 * 1024,
  maxFiles: 1,
  publicPrefix: '/uploads',
  imageTypes: Object.freeze({
    'image/jpeg': Object.freeze({ extension: '.jpg', signatures: [Buffer.from([0xff, 0xd8, 0xff])] }),
    'image/png': Object.freeze({ extension: '.png', signatures: [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])] }),
    'image/webp': Object.freeze({
      extension: '.webp',
      signatures: [Buffer.from('RIFF')],
      matches: (buffer) => buffer.length >= 12 && buffer.toString('ascii', 8, 12) === 'WEBP',
    }),
  }),
});

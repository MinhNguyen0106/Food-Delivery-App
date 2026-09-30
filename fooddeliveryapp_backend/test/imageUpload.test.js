const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const zlib = require('node:zlib');
const jwt = require('jsonwebtoken');
const imageConfig = require('../src/config/uploads');
const imageStorage = require('../src/services/imageStorageService');
const imageUpload = require('../src/middleware/imageUpload');
const errorHandler = require('../src/middleware/errorHandler');
const AppError = require('../src/services/AppError');

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function onePixelPng() {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 6;
  const pixels = zlib.deflateSync(Buffer.from([0, 255, 0, 0, 255]));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', pixels),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function multipart(boundary, file) {
  if (!file) return Buffer.from(`--${boundary}--\r\n`);
  return Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${file.filename}"\r\nContent-Type: ${file.mimeType}\r\n\r\n`
    ),
    file.buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
}

function request(port, method, path, { body, boundary, token, contentType } = {}) {
  return new Promise((resolve, reject) => {
    const headers = { connection: 'close' };
    if (boundary) headers['content-type'] = `multipart/form-data; boundary=${boundary}`;
    if (contentType) headers['content-type'] = contentType;
    if (body) headers['content-length'] = body.length;
    if (token) headers.authorization = `Bearer ${token}`;
    const req = http.request({ host: '127.0.0.1', port, method, path, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks),
      }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function signedToken(identity, secret) {
  return jwt.sign(
    { role: identity.role },
    secret,
    {
      subject: String(identity.user_id),
      issuer: 'food-delivery-backend',
      audience: 'food-delivery-api',
      expiresIn: '1h',
    }
  );
}

test('upload middleware accepts one valid image and rejects invalid multipart inputs', async (t) => {
  const express = require('express');
  const app = express();
  app.put('/upload', imageUpload, (req, res, next) => {
    try {
      imageStorage.validateImage(req.file);
      return res.status(200).json({ success: true, filename: req.file.originalname });
    } catch (error) {
      return next(error);
    }
  });
  app.use((req, res, next) => next(new AppError('Route not found', 404, 'NOT_FOUND')));
  app.use(errorHandler);
  const server = app.listen(0);
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const port = server.address().port;
  const boundary = 'image-test-boundary';
  const validFile = {
    filename: 'dish.png',
    mimeType: 'image/png',
    buffer: onePixelPng(),
  };

  const valid = await request(port, 'PUT', '/upload', {
    body: multipart(boundary, validFile),
    boundary,
  });
  assert.equal(valid.status, 200);
  assert.equal(JSON.parse(valid.body).filename, 'dish.png');

  const missing = await request(port, 'PUT', '/upload', {
    body: multipart(boundary, null),
    boundary,
  });
  assert.equal(missing.status, 400);
  assert.equal(JSON.parse(missing.body).error, 'IMAGE_REQUIRED');

  const badExtension = await request(port, 'PUT', '/upload', {
    body: multipart(boundary, { ...validFile, filename: 'script.exe', mimeType: 'image/png' }),
    boundary,
  });
  assert.equal(badExtension.status, 415);
  assert.equal(JSON.parse(badExtension.body).error, 'INVALID_IMAGE_EXTENSION');

  const badMime = await request(port, 'PUT', '/upload', {
    body: multipart(boundary, { ...validFile, filename: 'dish.png', mimeType: 'text/html' }),
    boundary,
  });
  assert.equal(badMime.status, 415);
  assert.equal(JSON.parse(badMime.body).error, 'INVALID_IMAGE_MIME');

  const spoofedMime = await request(port, 'PUT', '/upload', {
    body: multipart(boundary, {
      ...validFile,
      buffer: Buffer.from('<script>alert(1)</script>'),
    }),
    boundary,
  });
  assert.equal(spoofedMime.status, 415);
  assert.equal(JSON.parse(spoofedMime.body).error, 'INVALID_IMAGE_CONTENT');

  const tooLarge = await request(port, 'PUT', '/upload', {
    body: multipart(boundary, {
      ...validFile,
      buffer: Buffer.alloc(imageConfig.maxFileSizeBytes + 1, 0x41),
    }),
    boundary,
  });
  assert.equal(tooLarge.status, 413);
  assert.equal(JSON.parse(tooLarge.body).error, 'IMAGE_TOO_LARGE');

  const notMultipart = await request(port, 'PUT', '/upload', {
    body: Buffer.from('{}'),
    contentType: 'application/json',
  });
  assert.equal(notMultipart.status, 400);
  assert.equal(JSON.parse(notMultipart.body).error, 'INVALID_UPLOAD');
});

test('storage generates a relative unique path, serves it safely, and removes its managed file', async (t) => {
  process.env.PORT ||= '3000';
  process.env.DB_HOST ||= '127.0.0.1';
  process.env.DB_PORT ||= '3306';
  process.env.DB_USER ||= 'image-test';
  process.env.DB_PASSWORD ||= 'image-test';
  process.env.DB_NAME ||= 'image_test';
  process.env.JWT_SECRET ||= 'image-test-secret-with-at-least-32-bytes';
  const app = require('../src/app');

  const stored = await imageStorage.saveImage('foods', {
    originalname: 'dish.png',
    mimetype: 'image/png',
    buffer: onePixelPng(),
  });
  assert.match(stored.path, /^\/uploads\/foods\/\d+-[0-9a-f-]{36}\.png$/i);
  assert.equal(stored.path.includes(imageConfig.uploadsRoot), false);
  t.after(async () => {
    await imageStorage.deleteImage(stored.path, 'foods');
  });

  const server = app.listen(0);
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const response = await request(server.address().port, 'GET', stored.path);
  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /image\/png/);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.body.equals(onePixelPng()), true);

  assert.equal(await imageStorage.deleteImage(stored.path, 'foods'), true);
  assert.equal(await imageStorage.deleteImage(stored.path, 'foods'), false);
  const hiddenFile = await request(server.address().port, 'GET', '/uploads/.gitkeep');
  assert.equal(hiddenFile.status, 404);
});

test('image service rejects traversal filenames and reports the documented format rules', () => {
  assert.throws(
    () => imageStorage.validateImage({
      originalname: '../dish.png',
      mimetype: 'image/png',
      buffer: onePixelPng(),
    }),
    (error) => error.code === 'INVALID_IMAGE_FILENAME'
  );
  assert.deepEqual(
    Object.entries(imageConfig.imageTypes).map(([mime, rule]) => [mime, rule.extension]),
    [
      ['image/jpeg', '.jpg'],
      ['image/png', '.png'],
      ['image/webp', '.webp'],
    ]
  );
  assert.equal(imageConfig.maxFileSizeBytes, 5 * 1024 * 1024);
});

test('image replacement removes old file after commit and cleans new file on rollback', async () => {
  const catalogService = require('../src/services/catalogService');
  const catalogModel = require('../src/models/catalogModel');
  const db = require('../src/common/db');
  const methods = ['getFoodImage', 'lockFoodImage', 'updateFoodImage'];
  const originals = Object.fromEntries(methods.map((name) => [name, catalogModel[name]]));
  const originalGetConnection = db.getConnection;
  const originalDeleteImage = imageStorage.deleteImage;
  const originalLog = console.error;
  const existing = await imageStorage.saveImage('foods', {
    originalname: 'old.png',
    mimetype: 'image/png',
    buffer: onePixelPng(),
  });
  let row = { food_id: 7, restaurant_id: 9, image: existing.path };
  let failUpdate = false;
  let newPathOnRollback;
  catalogModel.getFoodImage = async () => ({ ...row });
  catalogModel.lockFoodImage = async () => ({ ...row });
  catalogModel.updateFoodImage = async (connection, foodId, restaurantId, imagePath) => {
    if (failUpdate) {
      newPathOnRollback = imagePath;
      throw Object.assign(new Error('simulated database error'), { code: 'ER_TEST_FAILURE' });
    }
    row.image = imagePath;
    return 1;
  };
  db.getConnection = (callback) => callback(null, {
    config: { trace: false },
    beginTransaction: (done) => done(null),
    commit: (done) => done(null),
    rollback: (done) => done(null),
    release: () => {},
  });
  console.error = () => {};

  try {
    const uploaded = await catalogService.uploadFoodImage(7, {
      originalname: 'replacement.png',
      mimetype: 'image/png',
      buffer: onePixelPng(),
    }, { role: 'RESTAURANT', restaurantId: 9 });
    assert.match(uploaded.image, /^\/uploads\/foods\//);
    assert.equal(row.image, uploaded.image);
    await assert.rejects(require('node:fs/promises').access(existing.absolutePath));

    const rollbackOld = await imageStorage.saveImage('foods', {
      originalname: 'rollback-old.png',
      mimetype: 'image/png',
      buffer: onePixelPng(),
    });
    row.image = rollbackOld.path;
    await imageStorage.deleteImage(uploaded.image, 'foods');
    failUpdate = true;
    await assert.rejects(
      catalogService.uploadFoodImage(7, {
        originalname: 'rollback-new.png',
        mimetype: 'image/png',
        buffer: onePixelPng(),
      }, { role: 'RESTAURANT', restaurantId: 9 }),
      (error) => error.code === 'ER_TEST_FAILURE'
    );
    assert.ok(newPathOnRollback);
    assert.equal(row.image, rollbackOld.path);
    assert.equal(
      await imageStorage.deleteImage(newPathOnRollback, 'foods'),
      false,
      'new image should already have been cleaned after rollback'
    );
    assert.equal(await imageStorage.deleteImage(rollbackOld.path, 'foods'), true);

    failUpdate = false;
    let imageSavedBeforeConnectionFailure;
    imageStorage.deleteImage = async (imagePath, entity) => {
      if (imagePath !== row.image) imageSavedBeforeConnectionFailure = imagePath;
      return originalDeleteImage(imagePath, entity);
    };
    db.getConnection = (callback) => callback(
      Object.assign(new Error('simulated connection failure'), { code: 'ER_TEST_CONNECTION' })
    );
    await assert.rejects(
      catalogService.uploadFoodImage(7, {
        originalname: 'connection-failure.png',
        mimetype: 'image/png',
        buffer: onePixelPng(),
      }, { role: 'RESTAURANT', restaurantId: 9 }),
      (error) => error.code === 'ER_TEST_CONNECTION'
    );
    assert.ok(imageSavedBeforeConnectionFailure);
    assert.equal(
      await originalDeleteImage(imageSavedBeforeConnectionFailure, 'foods'),
      false,
      'saved file should be removed if a DB connection cannot be acquired'
    );
  } finally {
    console.error = originalLog;
    db.getConnection = originalGetConnection;
    imageStorage.deleteImage = originalDeleteImage;
    for (const method of methods) catalogModel[method] = originals[method];
    await imageStorage.deleteImage(row.image, 'foods');
    await imageStorage.deleteImage(existing.path, 'foods');
  }
});

test('resource-specific image endpoints reject anonymous and wrong-role requests', async (t) => {
  process.env.PORT ||= '3000';
  process.env.DB_HOST ||= '127.0.0.1';
  process.env.DB_PORT ||= '3306';
  process.env.DB_USER ||= 'image-test';
  process.env.DB_PASSWORD ||= 'image-test';
  process.env.DB_NAME ||= 'image_test';
  process.env.JWT_SECRET ||= 'image-test-secret-with-at-least-32-bytes';

  const authModel = require('../src/models/authModel');
  const originalIdentityLookup = authModel.getAuthorizationIdentityById;
  const catalogService = require('../src/services/catalogService');
  const originalFoodUpload = catalogService.uploadFoodImage;
  const originalRestaurantUpload = catalogService.uploadRestaurantImage;
  authModel.getAuthorizationIdentityById = async (userId) => ({
    user_id: Number(userId),
    user_status: 'ACTIVE',
    role: Number(userId) === 25 ? 'CUSTOMER' : 'RESTAURANT',
    customer_id: Number(userId) === 25 ? 25 : null,
    restaurant_id: Number(userId) === 26 ? 9 : null,
    restaurant_status: Number(userId) === 26 ? 'ACTIVE' : null,
  });
  t.after(() => {
    authModel.getAuthorizationIdentityById = originalIdentityLookup;
    catalogService.uploadFoodImage = originalFoodUpload;
    catalogService.uploadRestaurantImage = originalRestaurantUpload;
  });

  const app = require('../src/app');
  const server = app.listen(0);
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const port = server.address().port;
  const boundary = 'image-auth-boundary';
  const body = multipart(boundary, {
    filename: 'dish.png',
    mimeType: 'image/png',
    buffer: onePixelPng(),
  });
  const anonymous = await request(port, 'PUT', '/api/foods/12/image', {
    body,
    boundary,
  });
  assert.equal(anonymous.status, 401);

  const customerToken = signedToken({ user_id: 25, role: 'CUSTOMER' }, process.env.JWT_SECRET);
  const forbidden = await request(port, 'PUT', '/api/foods/12/image', {
    body,
    boundary,
    token: customerToken,
  });
  assert.equal(forbidden.status, 403);

  const restaurantToken = signedToken({ user_id: 26, role: 'RESTAURANT' }, process.env.JWT_SECRET);
  catalogService.uploadFoodImage = async (foodId, file, actor) => {
    assert.equal(foodId, '12');
    assert.equal(file.originalname, 'dish.png');
    assert.equal(actor.restaurantId, 9);
    return { image: '/uploads/foods/test-image.png' };
  };
  const foodUpload = await request(port, 'PUT', '/api/foods/12/image', {
    body,
    boundary,
    token: restaurantToken,
  });
  assert.equal(foodUpload.status, 200);
  assert.deepEqual(JSON.parse(foodUpload.body), {
    success: true,
    data: { image: '/uploads/foods/test-image.png' },
  });

  catalogService.uploadRestaurantImage = async (restaurantId, file, actor) => {
    assert.equal(restaurantId, '9');
    assert.equal(file.originalname, 'dish.png');
    assert.equal(actor.userId, 26);
    return { image: '/uploads/restaurants/test-image.png' };
  };
  const restaurantUpload = await request(port, 'PUT', '/api/restaurants/9/image', {
    body,
    boundary,
    token: restaurantToken,
  });
  assert.equal(restaurantUpload.status, 200);
  assert.deepEqual(JSON.parse(restaurantUpload.body), {
    success: true,
    data: { image: '/uploads/restaurants/test-image.png' },
  });
});

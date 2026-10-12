const test = require('node:test');
const assert = require('node:assert/strict');
const routingService = require('../src/services/routingService');

test('OSRM route estimate returns rounded distance and duration', async (t) => {
  const originalFetch = global.fetch;
  const originalUrl = process.env.OSRM_ROUTING_URL;
  let requestedUrl;
  process.env.OSRM_ROUTING_URL = 'https://routing.test/route/v1/driving/';
  global.fetch = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      json: async () => ({
        code: 'Ok',
        routes: [{ distance: 1240.2, duration: 601.1 }],
      }),
    };
  };
  t.after(() => {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.OSRM_ROUTING_URL;
    else process.env.OSRM_ROUTING_URL = originalUrl;
  });

  assert.deepEqual(
    await routingService.getDrivingEstimate(
      { latitude: 10.1, longitude: 106.2 },
      { latitude: 10.2, longitude: 106.3 }
    ),
    { distanceMeters: 1241, travelSeconds: 602 }
  );
  assert.match(requestedUrl, /106\.2,10\.1;106\.3,10\.2/);
  assert.match(requestedUrl, /overview=false/);
});

test('invalid routing response fails closed with provider error', async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ code: 'NoRoute', routes: [] }),
  });
  const originalError = console.error;
  console.error = () => {};
  t.after(() => {
    global.fetch = originalFetch;
    console.error = originalError;
  });

  await assert.rejects(
    routingService.getDrivingEstimate(
      { latitude: 10, longitude: 106 },
      { latitude: 11, longitude: 107 }
    ),
    { statusCode: 502, code: 'ROUTING_PROVIDER_ERROR' }
  );
});

test('invalid coordinates are rejected before calling the routing provider', async () => {
  await assert.rejects(
    routingService.getDrivingEstimate(
      { latitude: 91, longitude: 106 },
      { latitude: 10, longitude: 107 }
    ),
    { statusCode: 400, code: 'INVALID_COORDINATES' }
  );
});

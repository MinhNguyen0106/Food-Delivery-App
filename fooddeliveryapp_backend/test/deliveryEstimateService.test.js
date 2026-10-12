const test = require('node:test');
const assert = require('node:assert/strict');
const deliveryEstimateService = require('../src/services/deliveryEstimateService');

test('estimated travel time uses the configured average speed of 20 km/h', () => {
  assert.equal(
    deliveryEstimateService.calculateTravelSeconds(1000),
    Math.ceil(3600 / deliveryEstimateService.averageSpeedKmh)
  );
  assert.equal(deliveryEstimateService.calculateTravelSeconds(0), 0);
});

test('delivery range allows 10 km and rejects longer driving routes', () => {
  assert.equal(deliveryEstimateService.maxDeliveryDistanceMeters, 10000);
  assert.doesNotThrow(() =>
    deliveryEstimateService.assertWithinDeliveryRange(10000)
  );
  assert.throws(
    () => deliveryEstimateService.assertWithinDeliveryRange(10001),
    (error) =>
      error.statusCode === 400 &&
      error.code === 'DELIVERY_DISTANCE_EXCEEDED' &&
      error.message ===
        'Khoảng cách quá xa hoặc thời gian quá gấp, không thể đảm bảo giao đúng giờ.'
  );
});

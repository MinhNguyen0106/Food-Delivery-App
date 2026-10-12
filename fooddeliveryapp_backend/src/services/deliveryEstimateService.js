const AppError = require('./AppError');
const {
  deliveryAverageSpeedKmh,
  maxDeliveryDistanceMeters,
} = require('../config/env');

const SCHEDULED_DELIVERY_ERROR =
  'Khoảng cách quá xa hoặc thời gian quá gấp, không thể đảm bảo giao đúng giờ.';

function calculateTravelSeconds(distanceMeters) {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    throw new AppError('Driving distance is invalid', 502, 'ROUTING_PROVIDER_ERROR');
  }
  return Math.ceil(distanceMeters * 3.6 / deliveryAverageSpeedKmh);
}

function assertWithinDeliveryRange(distanceMeters) {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    throw new AppError('Driving distance is invalid', 502, 'ROUTING_PROVIDER_ERROR');
  }
  if (distanceMeters > maxDeliveryDistanceMeters) {
    throw new AppError(
      SCHEDULED_DELIVERY_ERROR,
      400,
      'DELIVERY_DISTANCE_EXCEEDED'
    );
  }
}

module.exports = {
  calculateTravelSeconds,
  assertWithinDeliveryRange,
  averageSpeedKmh: deliveryAverageSpeedKmh,
  maxDeliveryDistanceMeters,
};

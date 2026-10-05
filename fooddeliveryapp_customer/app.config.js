module.exports = ({ config }) => {
  const plugins = [
    ...(config.plugins ?? []),
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Cho phép Food Delivery truy cập vị trí để chọn địa chỉ giao hàng.',
      },
    ],
  ];

  return {
    ...config,
    plugins,
  };
};

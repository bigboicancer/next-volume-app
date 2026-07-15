module.exports = ({ config }) => {
  const basePath = (process.env.EXPO_BASE_PATH || '').replace(/^\/+|\/+$/g, '');

  return {
    ...config,
    experiments: {
      ...config.experiments,
      ...(basePath ? { baseUrl: `/${basePath}` } : {}),
    },
  };
};

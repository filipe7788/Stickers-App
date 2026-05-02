module.exports = {
  dependencies: {
    // expo base package Android module can't compile in bare RN — only iOS needed
    expo: {
      platforms: {
        android: null,
      },
    },
  },
};

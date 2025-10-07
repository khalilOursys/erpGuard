const nextConfig = {
  output: 'standalone',
  server: {
    port: 3000,  // FIXED: Explicit port 3000 (overrides env)
    host: '0.0.0.0'  // Binds all interfaces for Docker/nginx
  },
  // Add any other configs (e.g., env for API_URL if needed)
};

module.exports = nextConfig;

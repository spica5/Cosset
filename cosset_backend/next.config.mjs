/**
 * @type {import('next').NextConfig}
 */

const nextConfig = {
  env: {
    // DEV_API: `http://localhost:7272`,
    DEV_API: `http://192.168.146.142:7272`,
    PRODUCTION_API: 'https://cosset-api.vercel.app',
  },
  allowedDevOrigins: [
    '192.168.146.142',
  ],
};

export default nextConfig;

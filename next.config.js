/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Rewrite the root path to the profile page
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/nothinglessthanangels',
      },
    ];
  },
};

module.exports = nextConfig;

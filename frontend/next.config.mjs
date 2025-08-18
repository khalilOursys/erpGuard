/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', //creates minmimal build
  images: {
    unoptimized: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: "/logo.png", destination: "/images/logo.png" }];
  },
};

export default nextConfig;

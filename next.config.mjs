/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "services.sentinel-hub.com",
      },
      {
        protocol: "https",
        hostname: "cdnjs.cloudflare.com",
      },
      {
        protocol: "https",
        hostname: "firebug.az",
      },
      {
        protocol: "https",
        hostname: "server.arcgisonline.com",
      }
    ],
  },
};

export default nextConfig;

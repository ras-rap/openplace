// next.config.js (updated)
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  allowedDevOrigins: ['94.231.215.244:3000', '185.244.1.28'],
  compress: false,
  
  
  // Allow cross-origin requests in development
  // async headers() {
  //   return [
  //     {
  //       source: '/(.*)',
  //       headers: [
  //         {
  //           key: 'Access-Control-Allow-Origin',
  //           value: '*',
  //         },
  //         {
  //           key: 'Access-Control-Allow-Methods',
  //           value: 'GET, POST, PUT, DELETE, OPTIONS',
  //         },
  //         {
  //           key: 'Access-Control-Allow-Headers',
  //           value: 'Content-Type, Authorization',
  //         },
  //       ],
  //     },
  //   ];
  // },

  // Configure allowed dev origins

  // Custom webpack config
  webpack: (config, { dev, isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig
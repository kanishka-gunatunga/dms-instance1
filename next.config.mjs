/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'sites.techvoice.lk', 'dms.genaitech.dev'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sites.techvoice.lk',
        pathname: '/dms-backend/public/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'dms.genaitech.dev',
        pathname: '/dms-backend/uploads/**',
      },
    ],
  },

  async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: 'https://dms-deep-search-and-ai.vercel.app' },
        { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        {
          key: 'Content-Security-Policy',
          value: `
            default-src 'self';
            base-uri 'self';
            object-src 'none';
            connect-src 'self' https://dms.genaitech.dev;
            img-src 'self' data: https:;
            script-src 'self' 'unsafe-inline' 'unsafe-eval';
            style-src 'self' 'unsafe-inline' https:;
            font-src 'self' https: data:;
            frame-src https://dms.genaitech.dev https://view.officeapps.live.com;
            frame-ancestors 'self';
        `.replace(/\s{2,}/g, ' ')
        },
      ]
    }
  ]
}

};

export default nextConfig;

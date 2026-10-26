/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-parse', 'pg'],
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;

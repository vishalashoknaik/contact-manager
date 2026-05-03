import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactCompiler: true,
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
}

export default nextConfig

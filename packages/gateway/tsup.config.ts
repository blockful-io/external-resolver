import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['./cmd/database.ts', './cmd/arbitrum.ts', './cmd/metadata.ts'],
  noExternal: [/@blockful/],
  splitting: true,
  bundle: true,
  shims: true,
  outDir: './dist',
  clean: true,
  minify: false,
  sourcemap: false,
  format: ['cjs'],
  target: 'es2022',
  platform: 'node',
})

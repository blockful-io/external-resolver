import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['./cmd/database.ts'],
  noExternal: [/@blockful/],
  splitting: true,
  bundle: true,
  shims: true,
  outDir: './dist',
  clean: true,
  minify: false,
  sourcemap: false,
  format: ['esm'],
  target: 'es2022',
  platform: 'node',
})

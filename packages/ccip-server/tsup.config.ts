import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['./src/index.ts'],
  noExternal: [/ethers/],
  splitting: false,
  bundle: true,
  outDir: './dist',
  clean: true,
  minify: true,
  sourcemap: false,
  format: ['esm'],
  target: 'es2022',
})

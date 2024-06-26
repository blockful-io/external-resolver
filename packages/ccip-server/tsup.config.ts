import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['./src/index.ts'],
  noExternal: [/ethers/],
  splitting: false,
  bundle: true,
  outDir: './dist',
  clean: true,
  minify: false,
  sourcemap: false,
  format: ['cjs'],
  target: 'es2022',
})

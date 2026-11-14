import { resolve } from 'node:path';
import { defineConfig } from 'vite';
export default defineConfig(({ command, mode }) => ({
  root: 'web',
  base: './',
  resolve: {
    alias:
      mode === 'qa'
        ? [
            {
              find: './data/initial-data.js',
              replacement: resolve('tests/fixtures/initial-data.js'),
            },
          ]
        : [],
  },
  build: {
    outDir: mode === 'qa' ? '../.tools/qa-dist' : '../dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: { host: '127.0.0.1', port: mode === 'qa' ? 5180 : 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  plugins: [
    {
      name: 'local-development-csp',
      transformIndexHtml(html) {
        return command === 'serve'
          ? html.replace(
              "connect-src 'self'",
              "connect-src 'self' ws://127.0.0.1:* ws://localhost:*",
            )
          : html;
      },
    },
  ],
}));

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err: any) => {
            if (err?.code === 'ECONNABORTED' || err?.code === 'ECONNRESET') return;
            console.warn('[vite-proxy] WebSocket proxy error:', err?.message || err);
          });
          proxy.on('proxyReqWs', (_proxyReq, _req, socket: any) => {
            if (!socket || typeof socket.on !== 'function') return;
            const originalOn = socket.on.bind(socket);
            socket.on = function (event: string, listener: (...args: any[]) => void) {
              if (event === 'error') {
                const wrappedListener = (err: any) => {
                  if (err?.code === 'ECONNABORTED' || err?.code === 'ECONNRESET' || err?.code === 'EPIPE') {
                    // Benign client abort / page navigation on Windows; suppress console noise
                    return;
                  }
                  return listener(err);
                };
                return originalOn(event, wrappedListener);
              }
              return originalOn(event, listener);
            };
          });
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});

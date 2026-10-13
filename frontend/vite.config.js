import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development `npm run dev` proxies API calls to a locally running FastAPI (port 8000).
// In containers the same relative /api path is proxied by Nginx or routed by the Kubernetes Ingress.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
});

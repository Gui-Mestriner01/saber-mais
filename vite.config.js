import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Deixa o site abrir em outros aparelhos da mesma rede (celular, tablet).
    // O terminal mostra o endereço "Network: http://192.168.x.x:5173".
    host: true,
  },
  preview: {
    host: true,
  },
})

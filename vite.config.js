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
  build: {
    /* O JavaScript é dividido por tela (cada página vira um pedacinho), mas o
       CSS continua num arquivo só. Se o CSS também fosse dividido, a folha de
       cada tela seria carregada DEPOIS da Celular.css e os ajustes de celular
       perderiam a briga — as telas do professor voltavam a estourar a largura. */
    cssCodeSplit: false,

    /* O minificador padrão apaga a palavra "debugger" do código final, e é
       justamente ela que a trava do Inspecionar usa (travaInspecionar.js).
       O terser mantém, e o resto do trabalho dele é igual. */
    minify: 'terser',
    terserOptions: { compress: { drop_debugger: false } },
  },
})

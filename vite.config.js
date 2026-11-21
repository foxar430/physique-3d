import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' : chemins relatifs, compatible GitHub Pages
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5180 },
})

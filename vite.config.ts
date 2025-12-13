import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/Real-Life-ESL-Tutor-Avatar/',
  plugins: [vue()],
  server: {
    host: true,
    port: 5178,
  },
})

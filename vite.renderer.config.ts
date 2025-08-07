import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig(async () => {
  const react = (await import('@vitejs/plugin-react')).default;
  const tailwindcss = (await import('@tailwindcss/vite')).default;
  
  return {
    plugins: [react(), tailwindcss()],
  };
});

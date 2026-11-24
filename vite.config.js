import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this project under /StudyHub2/ rather than the domain root.
export default defineConfig({
  plugins: [react()],
  base: '/StudyHub2/',
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  // The Vercel Marketplace Supabase integration injects NEXT_PUBLIC_* names; accept those as well as VITE_*.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_']
});

import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api':     { target: 'http://localhost:8080', changeOrigin: true },
      //'/media':   { target: 'http://localhost:8080', changeOrigin: true },
      '/uploads': { target: 'http://localhost:8080', changeOrigin: true }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),

        login: resolve(__dirname, 'pages/auth/login.html'),
        signup: resolve(__dirname, 'pages/auth/signup.html'),
        
        postPublication: resolve(__dirname, 'pages/seller/postPublication.html'),

        // Ajusta/añade según tus HTML reales:
        
        // adminDashboard: resolve(__dirname, 'pages/admin/dashboard.html'),
        // listerDashboard: resolve(__dirname, 'pages/lister/dashboard.html'),
        // profile: resolve(__dirname, 'pages/shared/profile.html'),
        // listingDetails: resolve(__dirname, 'pages/public/listing-details.html'),
      }
    }
  }
});
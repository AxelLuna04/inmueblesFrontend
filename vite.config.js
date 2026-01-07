
import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

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
        verifyEmail: resolve(__dirname, 'pages/auth/verifyEmail.html'),
        verifySuccess: resolve(__dirname, 'pages/auth/verifySuccess.html'),
        profile: resolve(__dirname, 'pages/shared/profile.html'),

        appointments: resolve(__dirname, 'pages/client/scheduleApppointment.html'),
        
        postListing: resolve(__dirname, 'pages/lister/postListing.html'),
        editListing: resolve(__dirname, 'pages/lister/editListing.html'),
        sellListing: resolve(__dirname, 'pages/lister/sellListing.html'),

        // Ajusta/añade según tus HTML reales:
        
        listerDashboard: resolve(__dirname, 'pages/lister/dashboard.html'),
        listingDetails: resolve(__dirname, 'pages/shared/listingDetail.html'),
        pay: resolve(__dirname, 'pages/client/pay.html'),

        adminDashboard: resolve(__dirname, 'pages/admin/dashboard.html'),
        historial: resolve(__dirname, 'pages/admin/historial.html'),

        error: resolve(__dirname, 'pages/error/notFound.html')
      }
    }
  }
});
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/setupTests.ts'],
        css: true,
        // Mock window and global objects for Ionic/Capacitor
        deps: {
            inline: ['@ionic/react', '@ionic/core']
        }
    },
})

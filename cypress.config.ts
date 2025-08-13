import { defineConfig } from 'cypress'

export default defineConfig({
    e2e: {
        setupNodeEvents(on, config) {
            // implement node event listeners here
        },
        baseUrl: 'http://localhost:3000',
        supportFile: 'cypress/support/e2e.ts',
        specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
        video: true,
        screenshotOnRunFailure: true,
        viewportWidth: 1280,
        viewportHeight: 720,
    },
    component: {
        devServer: {
            framework: 'vite',
            bundler: 'vite',
        },
        specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
        supportFile: 'cypress/support/component.ts',
    },
})

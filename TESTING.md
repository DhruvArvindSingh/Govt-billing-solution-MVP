# Testing Guide

This document describes how to run tests and quality checks for the Government Billing Solution MVP.

## Available Commands

### Unit Testing (Vitest)
```bash
npm run test.unit          # Run unit tests in watch mode
npm run test.unit -- --run # Run unit tests once
npm run test               # Run type check + unit tests
```

### End-to-End Testing (Cypress)
```bash
npm run test.e2e           # Run e2e tests in headless mode
npx cypress open           # Open Cypress Test Runner (interactive)
```

### Linting (ESLint)
```bash
npm run lint               # Check for linting errors
npm run lint:fix           # Fix auto-fixable linting errors
```

### PWA Assets
```bash
npm run generate-pwa-assets # Generate PWA icons and assets
```

## Test Structure

### Unit Tests
- Located in `src/components/__tests__/`
- Uses Vitest with Jest DOM matchers
- Example: `ErrorBoundary.test.tsx`

### E2E Tests
- Located in `cypress/e2e/`
- Uses Cypress for browser automation
- Example: `app.cy.ts`

### Test Configuration Files
- `vite.config.ts` - Vitest configuration
- `cypress.config.ts` - Cypress configuration
- `src/setupTests.ts` - Test setup and global configurations
- `.eslintrc.cjs` - ESLint rules and configuration
- `pwa-assets.config.ts` - PWA asset generation configuration

## Running Tests in CI/CD

All test commands can be run in CI/CD pipelines:

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run linting
npm run lint

# Run unit tests
npm run test.unit -- --run

# Run e2e tests (requires app to be running)
npm run dev &
npm run test.e2e
```

## Coverage

Unit test coverage reports are generated in the `coverage/` directory when running Vitest with coverage enabled.

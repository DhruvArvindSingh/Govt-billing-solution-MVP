# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Development
```bash
# Start development server
npm run dev

# Type checking only
npm run type-check

# Production build with optimizations
npm run build:prod

# Preview production build locally
npm run serve

# Clean build artifacts and node_modules cache
npm run clean
```

### Testing and Quality
```bash
# Run all tests (type-check + unit tests)
npm run test

# Run unit tests only
npm run test.unit

# Run E2E tests
npm run test.e2e

# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

### Mobile Development
```bash
# Build for Android (includes production build + capacitor sync)
npm run build:android

# Open Android Studio for further development
npm run android
```

### Analysis
```bash
# Analyze bundle size
npm run analyze

# Generate PWA assets
npm run generate-pwa-assets
```

## Architecture Overview

### Core Technology Stack
- **Framework**: Ionic React with TypeScript
- **Build Tool**: Vite with legacy browser support
- **Mobile**: Capacitor for cross-platform deployment
- **Spreadsheet Engine**: SocialCalc integration for government billing functionality
- **Storage**: Local storage + cloud integration (S3, Dropbox)
- **Authentication**: Token-based with server validation

### Application Structure

#### State Management
- **Global State**: React Context (`AppContext`) manages selected file, bill type, and auto-save status
- **Local Storage**: Persistent state via `LocalStorage` wrapper class
- **Authentication State**: Token-based auth with server validation on app start

#### Key Components Architecture
- **Home.tsx**: Main application container with spreadsheet integration
- **Login/**: Authentication components with modal system
- **Cloud/**: Cloud storage integration (S3, Dropbox)
- **Files/**: File management and local storage operations
- **Menu/**: Navigation and application controls
- **socialcalc/**: Custom SocialCalc integration for spreadsheet functionality

#### Services Layer
- **ApiService**: Centralized API communication with authentication
- **Export Services**: PDF and CSV export functionality with customizable formatting
- **Storage Services**: Local file operations and cloud sync

### Security Implementation
- **Password Protection**: AES encryption for sensitive files
- **Input Validation**: Form validation with security requirements
- **Authentication**: Server-side token validation
- **Android Security**: Network security config for production deployments

### Development Patterns
- **Error Boundaries**: Implemented at app level for graceful error handling
- **Auto-save**: Context-based auto-save with status tracking
- **TypeScript**: Strict typing disabled for legacy SocialCalc integration
- **PWA Support**: Service worker and offline capabilities

### Mobile-Specific Configuration
- **Capacitor Config**: Android scheme configuration and keyboard handling
- **Network Config**: HTTP/HTTPS handling for development and production
- **File System**: Native file operations via Capacitor plugins

### Build Configuration
- **Production Builds**: Console.log removal and asset optimization
- **Legacy Support**: Vite legacy plugin for older browser compatibility
- **CommonJS Support**: Vite plugin for SocialCalc integration
- **PWA**: Auto-updating service worker configuration

## Important Notes

### Environment Setup
- Server configuration via `.env` files (see ANDROID_NETWORK_FIX.md)
- Production API base URL configuration required
- Android development requires network security configuration

### Code Conventions
- TypeScript strict mode disabled due to SocialCalc integration
- React functional components with hooks pattern
- Ionic React component library usage
- Context providers for global state management

### Testing Strategy
- Unit tests with Vitest
- E2E tests with Cypress
- Type checking as part of test suite
- Android testing via Android Studio
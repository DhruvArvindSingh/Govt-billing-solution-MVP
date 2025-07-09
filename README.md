# Government Billing Solution MVP

A cross-platform billing and invoicing application built with Ionic React, featuring spreadsheet functionality, cloud storage, and password protection.

## Features

- ✅ **Spreadsheet Interface**: Full-featured spreadsheet with SocialCalc integration
- ✅ **Cross-Platform**: Web, Android, and iOS support
- ✅ **Cloud Storage**: S3 and Dropbox integration
- ✅ **Password Protection**: AES encryption for sensitive files
- ✅ **Export Options**: PDF and CSV export functionality
- ✅ **Offline Capable**: Local storage with sync capabilities
- ✅ **User Authentication**: Secure login system

## Production Deployment

### Prerequisites

- Node.js 18+ and npm
- TypeScript 5.1+
- For mobile: Android Studio and/or Xcode

### Build for Production

```bash
# Install dependencies
npm install

# Type check
npm run type-check

# Run tests
npm run test

# Build for production
npm run build:prod

# Preview production build
npm run serve
```

### Security Considerations

- All console.log statements are removed in production builds
- Input validation on all forms
- Password requirements: 8+ chars, uppercase, lowercase, number, special character
- AES encryption for protected files
- Authentication required for cloud operations

### Performance Optimizations

- Code splitting for faster initial load
- Asset optimization and compression
- React.memo and useCallback for render optimization
- Lazy loading of heavy components

### Environment Variables

Create a `.env.production` file:

```env
VITE_API_BASE_URL=https://your-production-api.com
VITE_APP_NAME=Government Billing Solution
VITE_ENVIRONMENT=production
```

### Mobile Build

```bash
# Build for Android
npm run build:android

# Open Android Studio
npm run android
```

### Monitoring

- Error boundaries implemented
- User feedback via toast notifications
- Loading states for all async operations
- Graceful error handling

## Development

```bash
# Start development server
npm run dev

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Clean build artifacts
npm run clean
```

## License

Licensed under the terms specified in the LICENSE file.

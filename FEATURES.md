# Government Billing Solution MVP - Features Documentation

## Overview

The Government Billing Solution MVP is a comprehensive Ionic React application designed for government billing operations with advanced spreadsheet functionality, cloud integration, and mobile support.

## Core Features

### 📊 Spreadsheet Engine
- **SocialCalc Integration**: Custom spreadsheet engine optimized for government billing
- **Real-time Calculations**: Live formula calculations and data validation
- **Multiple Bill Types**: Support for different government billing formats
- **Cell Formatting**: Advanced formatting options for professional invoices

### 🔐 Authentication & Security
- **Token-based Authentication**: Secure server-side validation
- **Password Protection**: AES encryption for sensitive files
- **Session Management**: Automatic token refresh and validation
- **Network Security**: HTTPS enforcement and security configurations

### 💾 File Management
- **Local Storage**: Persistent file storage with LocalStorage wrapper
- **File Operations**: Create, edit, delete, and rename files
- **Search Functionality**: Quick file search and filtering
- **File Protection**: Password-protected sensitive documents

### ☁️ Cloud Integration
- **Multi-provider Support**: S3 and Dropbox integration
- **Cloud Sync**: Automatic synchronization between local and cloud storage
- **Backup & Restore**: Secure cloud backup functionality
- **File Sharing**: Share files directly from cloud storage

### 📱 Mobile & Cross-Platform
- **Capacitor Integration**: Native mobile app functionality
- **Android APK**: Full Android application with optimized UI
- **PWA Support**: Progressive Web App with offline capabilities
- **Responsive Design**: Optimized for mobile and desktop interfaces

### 📄 Export & Sharing
- **PDF Export**: High-quality PDF generation with custom formatting
- **CSV Export**: Data export in CSV format for external processing
- **Multi-sheet PDF**: Export entire workbooks as consolidated PDFs
- **Email Integration**: Direct email sharing via Capacitor plugins
- **Print Support**: Native printing functionality

### 🔄 Auto-Save System
- **Smart Auto-Save**: Intelligent saving with debounce and retry mechanisms
- **Status Tracking**: Real-time save status indicators
- **User Preferences**: Configurable auto-save settings
- **Error Recovery**: Automatic retry on save failures

## Functionality Mapping

| Functionality | Folder Name | Description |
|---------------|-------------|-------------|
| **Spreadsheet Engine** | `src/components/socialcalc/` | Custom SocialCalc integration for government billing |
| **Authentication** | `src/components/Login/` | Token-based auth with modal system |
| **File Management** | `src/components/Files/` | Local file operations and management |
| **Cloud Storage** | `src/components/Cloud/` | S3 and Dropbox integration |
| **Local Storage** | `src/components/Storage/` | LocalStorage wrapper and utilities |
| **Menu System** | `src/components/Menu/` | Navigation and app controls |
| **New File Creation** | `src/components/NewFile/` | File creation wizard |
| **Password Protection** | `src/components/PasswordModal/` | File encryption and security |
| **Footer Controls** | `src/components/FooterSelector/` | Bottom navigation and bill type selection |
| **API Services** | `src/components/service/` | Centralized API communication |
| **Export Services** | `src/services/` | PDF, CSV, and multi-format export |
| **Global State** | `src/contexts/` | React Context for app-wide state |
| **Configuration** | `src/config/` | Auto-save and app configurations |
| **Main Application** | `src/pages/` | Core application container |
| **Error Handling** | `src/components/ErrorBoundary.tsx` | Global error boundary |

## Auto-Save System Details

### Configuration (Default Settings)

The auto-save system is configured via `src/config/autosave.config.ts` with the following default settings:

```typescript
// Production Settings
DEBOUNCE_DELAY: 3000ms        // Wait time after last edit before saving
SAVED_STATUS_DURATION: 2000ms // How long "Saved" status is displayed
ERROR_STATUS_DURATION: 5000ms // How long error status is displayed
MAX_RETRY_ATTEMPTS: 3         // Maximum retry attempts for failed saves
RETRY_DELAY: 1000ms          // Delay between retry attempts
MIN_SAVE_INTERVAL: 1000ms    // Minimum time between saves

// Development Settings (Shorter delays for faster feedback)
DEBOUNCE_DELAY: 2000ms
SAVED_STATUS_DURATION: 1500ms
```

### How Auto-Save Works

1. **Edit Detection**: The system monitors changes in the spreadsheet
2. **Debounce Mechanism**: Waits for `DEBOUNCE_DELAY` after the last edit before triggering save
3. **Status Updates**: 
   - Shows "Saving..." during save operation
   - Shows "Saved" for `SAVED_STATUS_DURATION` on success
   - Shows error message for `ERROR_STATUS_DURATION` on failure
4. **Retry Logic**: Automatically retries failed saves up to `MAX_RETRY_ATTEMPTS` times
5. **User Control**: Users can enable/disable auto-save via preferences stored in localStorage
6. **File Exclusions**: Certain files (default, template, untitled) are excluded from auto-save

### Auto-Save Status States

- **idle**: No pending save operations
- **saving**: Save operation in progress
- **saved**: Save completed successfully
- **error**: Save failed (will retry automatically)

### User Preference Management

- **Storage Key**: `autosave-enabled` in localStorage
- **Default**: Auto-save is enabled by default
- **Control Functions**: 
  - `isAutoSaveEnabled()`: Checks current preference
  - `setAutoSaveEnabled(boolean)`: Updates user preference

## Technology Stack

- **Frontend**: Ionic React with TypeScript
- **Build Tool**: Vite with legacy browser support
- **Mobile**: Capacitor for cross-platform deployment
- **State Management**: React Context API
- **Storage**: LocalStorage + Cloud (S3, Dropbox)
- **Security**: AES encryption, token-based auth
- **Export**: jsPDF, html2canvas for PDF generation

## Development Environment

The application supports both development and production environments with environment-specific configurations for auto-save timing, API endpoints, and debugging features.
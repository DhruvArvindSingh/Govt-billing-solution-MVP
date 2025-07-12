# Authentication and Auto-Save Implementation

This document explains the implementation of the authentication state management and auto-save functionality in the Government Billing Solution MVP.

## Features Implemented

### 1. Token-Based Authentication Check on App Start

**Location**: `src/pages/Home.tsx` - `checkAuthStatus()` function

**Functionality**:
- Checks for the presence of a token in localStorage when the app opens
- If a token exists, verifies it with the server using `ApiService.checkAuth()`
- Updates the login button state to "Logout" if authenticated
- Clears invalid tokens and shows "Login" button if authentication fails

**Code Flow**:
```typescript
const checkAuthStatus = async () => {
  // 1. Check if token exists in localStorage
  const token = localStorage.getItem('token');
  if (!token) {
    setIsLoggedIn(false);
    return;
  }

  // 2. Verify token with server
  const response = await ApiService.checkAuth();
  if (response.success && response.authenticated) {
    setIsLoggedIn(true);
  } else {
    // 3. Clear invalid token
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    setIsLoggedIn(false);
  }
};
```

### 2. Auto-Save on App Close

**Location**: `src/pages/Home.tsx` - `handleAppClose()` function

**Functionality**:
- Automatically saves the current file when the app is closed
- For default files: saves with a timestamped filename (format: `YYYYMMDD_HHMMSS`)
- For existing files: saves with the current filename
- Handles both protected (password-encrypted) and regular files
- Works on both web browsers and mobile apps

**Supported App Close Events**:
- **Web Browsers**: `beforeunload` event
- **Mobile Apps**: 
  - App state changes (background/foreground)
  - Back button press (Android)

**Timestamped Filename Generation**:
```typescript
const generateTimestampedFilename = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
};
```

**Example filenames**:
- `20241201_143022` (December 1, 2024 at 14:30:22)
- `20241201_095815` (December 1, 2024 at 09:58:15)

## Technical Implementation Details

### Dependencies Used

1. **@capacitor/app**: For mobile app lifecycle events
2. **Existing LocalStorage service**: For file persistence
3. **Existing ApiService**: For authentication validation

### Event Listeners

**Web Browser Events**:
```typescript
window.addEventListener('beforeunload', handleBeforeUnload);
```

**Mobile App Events**:
```typescript
// App state changes
App.addListener('appStateChange', ({ isActive }) => {
  if (!isActive) {
    handleAppClose();
  }
});

// Back button handling
App.addListener('backButton', ({ canGoBack }) => {
  if (!canGoBack) {
    handleAppClose();
    App.exitApp();
  }
});
```

### File Saving Logic

The auto-save functionality handles different scenarios:

1. **Default File**: 
   - Creates a new file with timestamped name
   - Preserves the original default template

2. **Existing File**:
   - Updates the existing file with current content
   - Maintains file metadata (created date, etc.)
   - Preserves password protection if applicable

3. **Protected Files**:
   - Uses the current file password for encryption
   - Maintains AES encryption consistency

### User Experience Enhancements

1. **Visual Feedback**: 
   - Shows a loading spinner when saving on app close
   - Positioned as a modal overlay with "Saving file..." message

2. **Error Handling**:
   - Graceful handling of save failures
   - Console logging for debugging
   - Non-blocking operation (fire-and-forget for beforeunload)

3. **Authentication State**:
   - Immediate visual feedback on app start
   - Proper token validation
   - Automatic cleanup of invalid tokens

## Usage Examples

### Authentication Flow
1. User opens the app
2. App checks localStorage for token
3. If token exists, verifies with server
4. Login button changes to "Logout" if authenticated
5. If token is invalid, it's cleared and login button remains

### Auto-Save Flow
1. User works on a spreadsheet
2. User closes the app/browser
3. App automatically saves the current work:
   - Default file → `20241201_143022`
   - Existing file → Updates existing file
4. User sees "Saving file..." notification
5. File is saved to localStorage

## Configuration

The auto-save feature respects the existing auto-save configuration:
- Excluded files (default, template, untitled) are handled specially
- Default files get timestamped names instead of being excluded
- Existing auto-save intervals and retry logic are preserved

## Error Handling

- Network failures during authentication check are handled gracefully
- File save failures are logged but don't block the app close process
- Invalid tokens are automatically cleared
- Missing file data is handled with appropriate defaults

## Security Considerations

- Token validation is performed on every app start
- Invalid tokens are immediately cleared from localStorage
- Password-protected files maintain their encryption
- No sensitive data is exposed in console logs (production build)

## Testing

The implementation can be tested by:
1. Opening the app with/without a token in localStorage
2. Closing the app/browser while working on a file
3. Checking the Files section for auto-saved files
4. Verifying authentication state changes 
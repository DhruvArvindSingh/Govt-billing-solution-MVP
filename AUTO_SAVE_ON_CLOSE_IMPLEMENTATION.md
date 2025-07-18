# Auto-Save on Close and Default File Restoration Implementation

This document explains the implementation of the automatic file saving when the app is closed and the default file restoration functionality in the Government Billing Solution MVP.

## Features Implemented

### 1. Auto-Save on App Close/Refresh

**Location**: `src/pages/Home.tsx` - `handleAppClose()` function

**Functionality**:
- Automatically saves the current file when the app is closed, refreshed, or browser is closed
- For files named "default": saves with the filename "default" to enable restoration on next app start
- For existing files: saves with the current filename (preserves existing file)
- Handles both protected (password-encrypted) and regular files
- Works on both web browsers and mobile apps

**Supported App Close Events**:
- **Web Browsers**: `beforeunload` event (page refresh, tab close, browser close)
- **Mobile Apps**: 
  - App state changes (background/foreground)
  - Back button press (Android)
  - App termination

### 2. Default File Restoration on App Start

**Location**: `src/pages/Home.tsx` - `initializeApplication()` function in useEffect

**Functionality**:
- Checks for the presence of a saved "default" file when the app starts
- If found: loads the saved file content and restores the user's work
- If not found: loads the template data from `app-data.ts`
- Automatically deletes the "default" file after loading to prevent conflicts

**Code Flow**:
```typescript
const initializeApplication = async () => {
  try {
    // 1. Check if there's a saved "default" file from previous session
    const defaultFile = await store._getFile("default");
    if (defaultFile && defaultFile.content) {
      // 2. Load the saved default file
      AppGeneral.viewFile("default", decodeURIComponent(defaultFile.content));
      updateSelectedFile("default");
      updateBillType(defaultFile.billType || 1);
      
      // 3. Delete the default file after loading it
      await store._deleteFile("default");
    }
  } catch (error) {
    // 4. No saved default file exists, load template data
    const data = DATA["home"][getDeviceType()]["msc"];
    AppGeneral.initializeApp(JSON.stringify(data));
  }
};
```

## Technical Implementation Details

### File Naming Strategy

1. **Default Files**:
   - **Save**: Always saved with filename "default"
   - **Purpose**: Enables restoration on next app start
   - **Cleanup**: Automatically deleted after successful restoration

2. **Named Files**:
   - **Save**: Saved with their existing filename
   - **Purpose**: Preserves user's saved work
   - **Persistence**: Remains in storage for future access

### Storage Enhancement

**New Method Added**: `_deleteFile()` in `src/components/Storage/LocalStorage.ts`

```typescript
_deleteFile = async (name: string) => {
  await Preferences.remove({ key: name });
};
```

### Auto-Save Logic

The auto-save functionality handles different scenarios:

1. **Default File (selectedFile === 'default')**:
   ```typescript
   const file = new File(
     new Date().toString(),
     new Date().toString(),
     content,
     'default', // Always saved as "default"
     billType
   );
   ```

2. **Existing Named File**:
   ```typescript
   const file = new File(
     existingData?.created || new Date().toString(),
     new Date().toString(), // Updated modified time
     content,
     selectedFile, // Preserves original filename
     billType
   );
   ```

3. **Protected Files**:
   - Uses current file password for encryption
   - Maintains AES encryption consistency
   - Handles both default and named protected files

### User Experience Benefits

1. **No Data Loss**: Work is automatically saved when app is unexpectedly closed
2. **Seamless Restoration**: Previous work is automatically restored on app restart
3. **Zero User Interaction**: No prompts or confirmations required
4. **Cross-Platform**: Works consistently on web browsers and mobile apps
5. **Memory Efficient**: Auto-cleanup prevents storage bloat

### Event Listeners

**Web Browser Events**:
```typescript
window.addEventListener('beforeunload', handleBeforeUnload);
```

**Mobile App Events**:
```typescript
// App going to background
App.addListener('appStateChange', ({ isActive }) => {
  if (!isActive) {
    handleAppClose();
  }
});

// Back button (Android)
App.addListener('backButton', ({ canGoBack }) => {
  if (!canGoBack) {
    handleAppClose();
    App.exitApp();
  }
});
```

### Error Handling

1. **Storage Errors**: Gracefully handled with console logging
2. **File Not Found**: Falls back to template data loading
3. **Corruption Protection**: Validates file content before restoration
4. **Password Protection**: Maintains encryption integrity

## Usage Examples

### Scenario 1: User Working on Default File
1. User opens app → loads template data
2. User makes changes to spreadsheet
3. User closes browser/app → auto-saves as "default"
4. User reopens app → restores previous work from "default" file
5. System deletes "default" file after restoration

### Scenario 2: User Working on Named File
1. User opens existing file "Invoice_2024.txt"
2. User makes changes
3. User closes app → auto-saves to "Invoice_2024.txt"
4. User reopens app → loads template (no "default" file exists)
5. User can manually open "Invoice_2024.txt" to see saved changes

### Scenario 3: User Working on Protected File
1. User opens password-protected file
2. User makes changes
3. User closes app → auto-saves with same password encryption
4. User reopens app → loads template
5. User can manually open protected file with password

## Integration with Existing Features

1. **Auto-Save System**: Works alongside existing auto-save functionality
2. **File Management**: Integrates with Files component for manual file operations
3. **Cloud Storage**: Complements cloud save/load operations
4. **Password Protection**: Maintains encryption for protected files
5. **Mobile Apps**: Leverages Capacitor for native app lifecycle events

This implementation ensures that users never lose their work, even if they forget to save or if the app is unexpectedly closed, while maintaining the existing file management workflow. 
# Mobile Download Guide

This guide explains how to test and use the PDF and CSV download functionality on Android devices.

## Features Added

### 📱 **Mobile-Specific Downloads**
- **PDF Export**: Creates PDF files and shares them via Android's native sharing system
- **CSV Export**: Creates CSV files and shares them via Android's native sharing system
- **Automatic Detection**: App detects if running on mobile and uses appropriate download method

### 🔧 **Capacitor Plugins Added**
1. **@capacitor/filesystem**: For writing files to device storage
2. **@capacitor/share**: For sharing files through Android's native share dialog

### 🛡️ **Android Permissions Added**
- `READ_EXTERNAL_STORAGE`: For reading files
- `WRITE_EXTERNAL_STORAGE`: For writing files (Android ≤ 28)
- `MANAGE_EXTERNAL_STORAGE`: For broader file access
- Media permissions for Android 13+

## How It Works

### 🌐 **Web Browser (Desktop)**
- Traditional download using browser's download functionality
- Files are saved to the default Downloads folder

### 📱 **Mobile Device (Android)**
1. **File Creation**: Files are written to the device's Documents directory
2. **Share Dialog**: Android's native share dialog opens automatically
3. **User Choice**: User can choose how to share/save the file:
   - Save to Google Drive
   - Share via WhatsApp, Email, etc.
   - Save to Gallery (for PDF)
   - Open with another app

## Testing Instructions

### 🔨 **Building for Android**

1. **Build the web assets:**
   ```bash
   npm run build
   ```

2. **Sync with Android:**
   ```bash
   npx cap sync android
   ```

3. **Open in Android Studio:**
   ```bash
   npx cap open android
   ```

4. **Run on device or emulator from Android Studio**

### 📋 **Testing Steps**

1. **Create/Edit an Invoice:**
   - Open the app on Android
   - Create or edit an invoice with some data

2. **Test PDF Export:**
   - Tap the menu button (≡) in bottom-right
   - Select "Export as PDF"
   - Wait for processing
   - Share dialog should appear
   - Choose where to save/share the PDF

3. **Test CSV Export:**
   - Tap the menu button (≡) in bottom-right
   - Select "Export as CSV"
   - Share dialog should appear
   - Choose where to save/share the CSV

### ✅ **Expected Behavior**

- **Success Toast**: Green toast message appears confirming export
- **Share Dialog**: Android's native share dialog opens
- **File Options**: Multiple apps available for sharing/saving
- **File Location**: Files saved to Documents directory

### 🐛 **Troubleshooting**

#### **Permission Issues**
- If downloads fail, check if app has storage permissions
- Go to Settings > Apps > [Your App] > Permissions
- Enable Storage permissions

#### **Share Dialog Not Appearing**
- Ensure device has apps that can handle PDF/CSV files
- Try installing Google Drive, Gmail, or file manager apps

#### **File Not Found Errors**
- Check Android logs in Android Studio
- Verify Capacitor plugins are properly installed
- Ensure `npx cap sync android` was run after changes

### 📱 **Device Requirements**

- **Android Version**: 5.0+ (API level 21+)
- **Storage**: Sufficient space for generated files
- **Apps**: At least one app capable of handling PDF/CSV files

### 🔍 **Debugging**

#### **View Logs in Android Studio**
1. Connect device or start emulator
2. Open Android Studio
3. View > Tool Windows > Logcat
4. Filter by your app package name
5. Look for filesystem and share plugin logs

#### **Common Log Messages**
```
✅ File written to: content://...
✅ PDF exported and shared successfully
❌ Mobile PDF export error: [error details]
❌ Permission denied
```

### 📂 **File Locations**

- **Documents Directory**: `/storage/emulated/0/Documents/`
- **App-Specific Storage**: `/Android/data/[package]/files/Documents/`

### 🎯 **User Experience**

1. **Tap Export** → Processing indicator
2. **File Created** → Success toast appears
3. **Share Dialog** → User chooses destination
4. **File Shared** → Available in chosen app/location

## Notes

- Files are created in the Documents directory for better user access
- The share dialog provides maximum flexibility for users
- Web browser fallback ensures compatibility across all platforms
- Success/error messages provide clear feedback to users 
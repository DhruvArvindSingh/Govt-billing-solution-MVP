# Mobile Email Integration Guide

This document explains how the email functionality works on Android and iOS platforms, including platform-specific optimizations and fallback methods.

## Overview

The email service has been enhanced to work seamlessly on both Android and iOS platforms using a multi-tier approach:

1. **Primary**: Native mobile sharing using Capacitor APIs
2. **Secondary**: Gmail API with mobile optimizations  
3. **Fallback**: Platform-specific email app integration

## Platform Detection

The system automatically detects the platform and adjusts behavior accordingly:

```typescript
const isMobile = isPlatform('hybrid');
const isAndroid = isPlatform('android');
const isIOS = isPlatform('ios');
```

## Mobile Email Flow

### 1. Native Mobile Email (Primary Method)

For mobile platforms, the app first attempts to use native sharing capabilities:

#### **File Generation and Storage**:
- CSV and PDF files are generated as Blobs
- Files are saved to device cache using Capacitor Filesystem
- Files are prepared for sharing with native email apps

#### **Capacitor Share API**:
```typescript
await Share.share({
  title: emailSubject,
  text: emailText,
  files: [csvFile.uri, pdfFile.uri],
  dialogTitle: 'Share via Email'
});
```

#### **Benefits**:
- ✅ Native email app integration
- ✅ Proper file attachment handling
- ✅ Works with all email apps (Gmail, Outlook, Apple Mail, etc.)
- ✅ No internet dependency for local operations

### 2. Gmail API (Secondary Method)

If native email fails, the system falls back to Gmail API with mobile optimizations:

#### **Mobile-Optimized Settings**:
```typescript
// Mobile-friendly OAuth settings
this.tokenClient = window.google.accounts.oauth2.initTokenClient({
  client_id: GMAIL_CLIENT_ID,
  scope: 'https://www.googleapis.com/auth/gmail.send',
  ...(isMobile && {
    use_fedcm_for_prompt: false,
    cancel_on_tap_outside: false,
  })
});

// Mobile-specific token request
this.tokenClient.requestAccessToken({
  prompt: isMobile ? 'select_account' : 'consent'
});
```

#### **Enhanced Error Handling**:
- Mobile-specific timeouts and retry logic
- Better error messages for mobile users
- Graceful degradation to fallback methods

### 3. Fallback Methods

If both native sharing and Gmail API fail, the system provides multiple fallback options:

#### **Gmail App Integration** (Mobile):
```typescript
// Try Gmail app URL scheme first
const gmailAppUrl = `googlegmail://co?to=${to}&su=${subject}&body=${body}`;
window.location.href = gmailAppUrl;

// Fallback to web Gmail
setTimeout(() => {
  window.open(gmailUrl, '_system');
}, 2000);
```

#### **Native Email Client** (Mobile):
```typescript
// Use location.href for better app integration
window.location.href = mailtoUrl;
```

## Platform-Specific Features

### Android Specific

#### **App Integration**:
- Gmail app deep linking support
- Native share sheet integration
- File attachment handling via Content URIs

#### **Permissions**:
- No special permissions required for basic email
- File access handled by Capacitor

### iOS Specific

#### **App Integration**:
- Apple Mail integration
- Gmail app support
- Native sharing sheet

#### **Considerations**:
- File sharing handled by iOS document interaction
- Respects user's default email app preference

## Configuration

### Capacitor Configuration

Updated `capacitor.config.ts` includes:

```typescript
server: {
  allowNavigation: [
    'https://accounts.google.com/*',
    'https://mail.google.com/*',
    'mailto:*',
    'googlegmail://*'
  ]
},
plugins: {
  Share: {
    subject: 'Government Billing Solution - Document Export',
    dialogTitle: 'Share via Email'
  },
  Filesystem: {
    tempFolder: 'temp'
  }
}
```

### Required Permissions

#### **Android (android/app/src/main/AndroidManifest.xml)**:
```xml
<!-- Internet permission for Gmail API -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- File access for attachments -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

#### **iOS (ios/App/App/Info.plist)**:
```xml
<!-- Email sending capability -->
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>mailto</string>
    <string>googlegmail</string>
</array>
```

## Error Handling

### Mobile-Specific Error Scenarios

1. **No Email App Installed**:
   - Rare on modern devices
   - System provides user guidance
   - Alternative sharing methods offered

2. **File Permission Issues**:
   - Handled by Capacitor automatically
   - Graceful fallback to text-only email

3. **Network Connectivity**:
   - Native sharing works offline
   - Gmail API requires internet
   - Clear error messages provided

### Error Recovery

```typescript
try {
  await sendEmailMobile(recipientEmail);
} catch (mobileError) {
  console.log("Mobile email failed, trying Gmail API:", mobileError);
  // Fall back to Gmail API
  await gmailService.sendHtmlEmail(...);
}
```

## User Experience

### Email Flow on Mobile

1. **User Input**: Recipient email address via popup
2. **Platform Detection**: Automatic platform optimization
3. **File Generation**: CSV and PDF created in background
4. **Native Sharing**: Device share sheet appears
5. **App Selection**: User chooses email app
6. **Pre-filled Email**: Recipient, subject, body, and attachments ready

### Visual Feedback

- Loading indicators during file generation
- Platform-specific progress messages
- Clear success/error notifications
- Helpful fallback instructions

## Testing on Mobile

### Android Testing

1. **Build APK**:
   ```bash
   npm run build:android
   ```

2. **Install on Device**:
   ```bash
   npx cap run android
   ```

3. **Test Email Flow**:
   - Open document in app
   - Tap Email button
   - Enter recipient email
   - Verify files attach correctly

### iOS Testing

1. **Build for iOS**:
   ```bash
   npx cap build ios
   ```

2. **Xcode Deployment**:
   - Open project in Xcode
   - Deploy to device/simulator

3. **Test Email Flow**:
   - Same as Android testing
   - Verify iOS-specific features

## Debugging

### Enable Debug Logging

```typescript
console.log(`Platform detection - Mobile: ${isMobile}, Android: ${isAndroid}, iOS: ${isIOS}`);
console.log("Mobile email error:", error);
console.log("Gmail API initializing on mobile platform");
```

### Common Issues and Solutions

1. **Files Not Attaching**:
   - Check Capacitor Filesystem permissions
   - Verify file paths and URIs
   - Test file generation separately

2. **Email App Not Opening**:
   - Ensure device has email app
   - Check URL scheme handling
   - Verify Capacitor configuration

3. **Gmail API Issues on Mobile**:
   - Check internet connectivity
   - Verify OAuth configuration
   - Test web version first

## Performance Optimization

### File Size Management

- PDF quality optimized for mobile (1.5x scale)
- CSV size limited by content
- Automatic cleanup of temporary files

### Memory Management

- Blob cleanup after file operations
- URL revocation for object URLs
- Efficient file stream handling

## Future Enhancements

### Planned Features

1. **Attachment Preview**: Show files before sharing
2. **Multiple Recipients**: Support CC/BCC on mobile
3. **Template Emails**: Pre-defined email templates
4. **Offline Support**: Queue emails when offline

### Platform-Specific Improvements

1. **Android**: Android 11+ scoped storage support
2. **iOS**: iOS 15+ Mail privacy features
3. **Universal**: Cross-platform file handling improvements

## Support

### Email Integration Issues

- Check platform compatibility
- Verify Capacitor plugin versions
- Test on physical devices
- Review console logs for errors

### Performance Issues

- Monitor file generation times
- Check memory usage during operations
- Optimize file sizes if needed
- Test on older devices

The mobile email integration provides a robust, platform-optimized solution that ensures reliable email functionality across all devices and configurations.



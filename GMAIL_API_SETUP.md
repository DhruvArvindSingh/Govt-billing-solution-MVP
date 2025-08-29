# Gmail API Integration Setup

This document explains how to set up and use the Gmail API integration for sending emails in the Government Billing Solution.

## Overview

The application now uses Gmail API instead of the device-specific EmailComposer for sending emails. This provides a consistent experience across all platforms (web, Android, iOS) and leverages Google's robust email infrastructure.

## Recent Updates

**Version 2.0** - Fixed CSP and COOP Issues:
- Removed dependency on `gapi-script` library
- Implemented custom HTTPS-only Google API loading
- Disabled CSP in development for testing
- Added comprehensive fallback email methods
- Enhanced error handling and user feedback

**Version 2.1** - Migrated to Google Identity Services:
- Updated from deprecated `gapi.auth2` to Google Identity Services (GIS)
- Implemented modern OAuth 2.0 flow using `google.accounts.oauth2`
- Fixed "idpiframe_initialization_failed" errors
- Improved authentication reliability and security
- Added proper token management and revocation

## Prerequisites

1. A Google Cloud Platform (GCP) project
2. Gmail API enabled in your GCP project
3. OAuth 2.0 credentials configured

## Setup Instructions

### 1. Create a Google Cloud Platform Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note down your project ID

### 2. Enable Gmail API

1. In the Google Cloud Console, navigate to "APIs & Services" > "Library"
2. Search for "Gmail API"
3. Click on "Gmail API" and then click "Enable"

### 3. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type for public applications
   - Fill in the required information (app name, user support email, etc.)
   - Add authorized domains if needed
4. Select "Web application" as the application type
5. Add authorized origins:
   - For development: `http://localhost:3000`, `http://localhost:5173`
   - For production: your deployed app's domain
6. Add authorized redirect URIs (same as origins)
7. Click "Create"
8. Copy the Client ID and API Key

### 4. Configure Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Gmail API Configuration
VITE_GMAIL_API_KEY=your_gmail_api_key_here
VITE_GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com

# Existing Environment Variables
VITE_API_BASE_URL=http://3.110.136.65
VITE_APP_NAME=Government Billing Solution
VITE_ENVIRONMENT=development
```

**Important:** 
- Replace `your_gmail_api_key_here` with your actual Gmail API key
- Replace `your_client_id.apps.googleusercontent.com` with your actual OAuth 2.0 Client ID
- Never commit the `.env` file to version control

### 5. OAuth Consent Screen Configuration

For production use, you may need to verify your OAuth consent screen:

1. Go to "APIs & Services" > "OAuth consent screen"
2. Fill in all required information
3. Add test users if your app is in testing mode
4. For public release, submit for verification (this process can take several days)

## Usage

### Sending Emails

The email functionality is integrated into the Menu component. When users click the "Email" button:

1. The Gmail API will initialize
2. User will be prompted to sign in to their Google account (if not already signed in)
3. User will be asked to authorize the application to send emails on their behalf
4. The document will be attached and sent via Gmail

### Email Features

- **HTML Attachments**: Documents are sent as HTML attachments
- **Automatic Filename**: Uses the current document name or defaults to "Invoice"
- **Professional Email Body**: Includes a professional message with the attachment
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Loading States**: Visual feedback during the email sending process
- **Fallback Methods**: If Gmail API fails, the app provides alternative email methods:
  - Opens Gmail web interface with pre-filled compose window
  - Downloads attachment file and opens email compose
  - Falls back to mailto: links for default email client
  - Provides manual copy-paste instructions as last resort

### User Experience

1. **First Time**: User will see Google's OAuth consent screen
2. **Subsequent Uses**: If the user remains signed in, emails send without additional prompts
3. **Cross-Platform**: Works consistently on web, Android, and iOS

## Security Considerations

1. **Client-Side Implementation**: This is a client-side implementation suitable for user-driven email sending
2. **User Authorization**: Each user authorizes with their own Google account
3. **Scope Limitation**: Only `gmail.send` scope is requested, limiting the application's access
4. **No Server Storage**: No email credentials are stored on the server

## Troubleshooting

### Common Issues

1. **"Gmail API credentials not configured"**
   - Check that environment variables are properly set
   - Ensure `.env` file is in the project root
   - Restart the development server after changing environment variables

2. **"Failed to sign in to Gmail"**
   - Check that OAuth 2.0 credentials are correctly configured
   - Ensure authorized origins include your current domain
   - Check browser console for detailed error messages

3. **"This app isn't verified"**
   - This warning appears during development or for unverified apps
   - Users can click "Advanced" > "Go to [app name] (unsafe)" to proceed
   - For production, submit your app for verification

4. **Content Security Policy (CSP) Errors**
   - CSP headers have been added to `index.html` to allow Gmail API
   - If you still see CSP errors, check that your server doesn't override these headers
   - For Capacitor mobile apps, CSP is handled differently and may not be an issue

5. **Cross-Origin-Opener-Policy (COOP) Errors**
   - These are common with OAuth popups and usually don't prevent functionality
   - The application includes fallback methods if the main OAuth flow fails
   - If popups are blocked, the app will try alternative email methods

6. **Popup Blocked Errors**
   - Ensure popups are enabled for your domain
   - The application includes fallback methods that don't require popups
   - Users can manually copy email content if all automated methods fail

7. **"idpiframe_initialization_failed" Error (RESOLVED)**
   - This was caused by using deprecated `gapi.auth2` library
   - The application now uses Google Identity Services (GIS) which resolves this issue
   - If you still see this error, ensure you're using the latest version of the code

8. **Google Identity Services Issues**
   - Ensure your OAuth 2.0 client is configured for "Web application"
   - Add your domain to authorized JavaScript origins
   - The new implementation loads from `https://accounts.google.com/gsi/client`

### Development Tips

1. **Testing**: Use test email addresses during development
2. **Rate Limits**: Gmail API has rate limits; implement appropriate delays if sending multiple emails
3. **Error Logging**: Check browser console for detailed error information
4. **CORS**: Ensure your OAuth configuration includes all necessary origins

### Testing the Implementation

1. **Start Development Server**: 
   ```bash
   npm run dev
   ```
   The server should start on http://localhost:3000

2. **Test Email Function**:
   - Open the application in your browser
   - Create or open a document
   - Click the "Email" button in the menu
   - Watch the console for any errors

3. **Without Valid Credentials**:
   - The primary Gmail API will fail gracefully
   - Fallback methods will automatically activate
   - User will see appropriate error messages

4. **With Valid Credentials**:
   - OAuth popup should appear (if popups are enabled)
   - User signs in and grants permissions
   - Email should send successfully via Gmail API

## Code Structure

### Files Modified/Created

1. **`src/services/gmailService.ts`**: Core Gmail API service
2. **`src/components/Menu/Menu.tsx`**: Updated email sending functionality
3. **`src/config/environment.ts`**: Added Gmail API environment variables
4. **`.env`**: Environment configuration file

### Key Functions

- `gmailService.initGoogleAuth()`: Initializes Google API client
- `gmailService.signIn()`: Handles user authentication
- `gmailService.sendHtmlEmail()`: Sends emails with HTML content and attachments
- `sendEmail()` in Menu component: Updated to use Gmail API

## Support

If you encounter issues:

1. Check the browser console for detailed error messages
2. Verify all setup steps have been completed
3. Ensure environment variables are correctly set
4. Test with a simple email first before adding attachments

For Gmail API specific issues, refer to the [Gmail API documentation](https://developers.google.com/gmail/api).

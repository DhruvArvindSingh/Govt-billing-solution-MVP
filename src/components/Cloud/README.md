# Cloud Component Setup

This component provides cloud storage integration with AWS S3 and Dropbox for the Government Billing Solution.

## Features

- **Dual Cloud Support**: Switch between AWS S3 and Dropbox storage
- **File Management**: Upload, download, edit, and delete files
- **Search Functionality**: Search through your cloud files
- **Invoice Upload**: Upload current invoice data directly to cloud storage
- **Responsive Design**: Works on both desktop and mobile devices

## Setup Instructions

### 1. Install Dependencies

The required dependencies should already be installed:
```bash
npm install @aws-sdk/client-s3 dropbox
```

### 2. Environment Variables

Create a `.env` file in your project root with the following variables.

**Note**: This project uses Vite, so environment variables must be prefixed with `VITE_` instead of `REACT_APP_`:

```env
# AWS S3 Configuration
VITE_REGION=us-east-1
VITE_BUCKET=your-s3-bucket-name
VITE_ACCESS_KEY=your-aws-access-key
VITE_SECRET_KEY=your-aws-secret-key

# Dropbox Configuration
VITE_DROPBOX_ACCESS_TOKEN=your-dropbox-access-token
```

### 3. AWS S3 Setup

1. Create an AWS account and navigate to S3
2. Create a new S3 bucket
3. Create an IAM user with S3 permissions:
   - Go to IAM → Users → Create User
   - Attach the `AmazonS3FullAccess` policy (or create a custom policy with bucket-specific permissions)
   - Create access keys for the user
4. Configure CORS for your S3 bucket:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": []
     }
   ]
   ```

### 4. Dropbox Setup

1. Go to [Dropbox Developers](https://www.dropbox.com/developers/apps)
2. Create a new app:
   - Choose "Scoped access"
   - Choose "Full Dropbox" access
   - Name your app
3. Generate an access token in the app settings
4. Make sure your app has the following permissions:
   - `files.metadata.write`
   - `files.metadata.read`
   - `files.content.write`
   - `files.content.read`

## Usage

1. Click the cloud icon in the toolbar to open the Cloud Storage modal
2. Switch between S3 and Dropbox tabs
3. Use the "Upload Invoice" button to save your current invoice to the cloud
4. Search through files using the search bar
5. Click the edit icon to load a file into the editor
6. Click the trash icon to delete a file

## Security Notes

- Never commit your `.env` file to version control
- Use environment-specific credentials for production
- Consider using AWS IAM roles for production deployments
- Regularly rotate your access keys and tokens

## Troubleshooting

- If you see "configuration missing" errors, check your environment variables
- For S3 CORS issues, ensure your bucket CORS policy allows your domain
- For Dropbox authentication errors, verify your access token and app permissions
- Check the browser console for detailed error messages 
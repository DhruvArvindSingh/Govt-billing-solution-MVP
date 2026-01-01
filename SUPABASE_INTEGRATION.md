# Supabase Integration

This document describes the Supabase database integration added to the Government Billing Solution MVP.

## Overview

Supabase has been added as the 8th database option in the unified multi-database architecture, providing users with an open-source Firebase alternative powered by PostgreSQL.

## What is Supabase?

**Supabase** is an open-source Firebase alternative that provides:
- **PostgreSQL Database**: Full-featured relational database with ACID compliance
- **Real-time Subscriptions**: Live data updates via WebSocket connections
- **Built-in Authentication**: User management and authorization
- **RESTful API**: Automatically generated API from database schema
- **Row-Level Security**: Fine-grained access control at the database level
- **Storage**: File storage similar to AWS S3
- **Edge Functions**: Serverless functions for custom logic

## Integration Details

### 1. API Service (`src/components/service/Apiservice.ts`)

#### Updated Type Definition
```typescript
type DatabaseType = 's3' | 'postgres' | 'firebase' | 'mongo' | 'neo4j' | 'orbitdb' | 'supabase';
```

#### API Endpoints
The following endpoints have been added to support Supabase operations:

- **List Files**: `POST /api/v1/listAllSupabase`
  - Lists all files stored in Supabase for the authenticated user
  
- **Get File**: `POST /api/v1/getFileSupabase`
  - Retrieves a specific file from Supabase
  
- **Upload File**: `POST /api/v1/uploadFileSupabase`
  - Uploads a file to Supabase with optional password protection
  
- **Delete File**: `POST /api/v1/deleteFileSupabase`
  - Deletes a file from Supabase

All endpoints follow the same unified API pattern as other databases, requiring JWT authentication tokens.

### 2. Cloud Storage UI (`src/components/Cloud/Cloud.tsx`)

#### State Management
Added the following state variables:
```typescript
const [supabaseFiles, setSupabaseFiles] = useState<{ [key: string]: number }>({});
const [supabasePasswordProtected, setSupabasePasswordProtected] = useState<{ [key: string]: boolean }>({});
```

#### Tab Navigation
Added a new tab button in the cloud storage modal:
```tsx
<button
    className={`tab-button ${activeTab === 'supabase' ? 'active' : ''}`}
    onClick={() => switchTab('supabase')}
    disabled={loading}
>
    ⚡ Supabase
</button>
```

#### Functions Added
- `loadFilesFromSupabase()`: Loads files from Supabase
- `saveFileToSupabase()`: Saves files to Supabase
- Updated `isFilePasswordProtected()` to handle Supabase files
- Updated `getCurrentFiles()` to return Supabase files when active
- Updated `getMigrationTargetDatabases()` to include Supabase
- Updated `getDatabaseDisplayName()` to display "Supabase"

### 3. Files Upload Selector (`src/components/Files/Files.tsx`)

Added Supabase option to the database selector:
```tsx
<IonSelectOption value="supabase">⚡ Supabase</IonSelectOption>
```

This allows users to upload local files directly to Supabase from the Files tab.

### 4. Documentation Updates

#### DATABASE.md
- Updated overview to mention 7 storage systems (was 6)
- Added Supabase as system #8 with detailed description
- Added Supabase to cloud database systems list
- Added Supabase-specific implementation details
- Added Supabase configuration requirements

#### README.md
- Updated database count from 6 to 7
- Added Supabase to the database list
- Updated architecture diagram to include Supabase node

## Features Supported

Supabase integration supports all standard database operations:

✅ **File Upload**: Upload spreadsheet files with optional password protection  
✅ **File Listing**: View all files stored in Supabase  
✅ **File Download**: Retrieve and edit files from Supabase  
✅ **File Deletion**: Remove files from Supabase  
✅ **Password Protection**: AES-256 encryption for sensitive files  
✅ **Cross-Database Migration**: Move files between Supabase and other databases  
✅ **Search**: Search through Supabase files  
✅ **Multi-Select**: Select multiple files for batch operations  

## Server-Side Requirements

To fully enable Supabase functionality, the backend API server needs to implement the following endpoints:

### 1. List All Files
```http
POST /api/v1/listAllSupabase
Content-Type: application/json

{
    "token": "JWT_TOKEN"
}

Response:
{
    "files": {
        "filename1.txt": 1704067200000,
        "filename2.txt": 1704153600000
    },
    "passwordProtectedFiles": {
        "secure_file.txt": 1704240000000
    }
}
```

### 2. Get File
```http
POST /api/v1/getFileSupabase
Content-Type: application/json

{
    "fileName": "invoice.txt",
    "isPasswordProtected": false,
    "token": "JWT_TOKEN"
}

Response:
{
    "success": true,
    "content": "file_content_here",
    "fileName": "invoice.txt",
    "isPasswordProtected": false,
    "lastModified": 1704067200000
}
```

### 3. Upload File
```http
POST /api/v1/uploadFileSupabase
Content-Type: application/json

{
    "fileName": "invoice.txt",
    "fileContent": "spreadsheet_data_here",
    "isPasswordProtected": false,
    "token": "JWT_TOKEN"
}

Response:
{
    "success": true,
    "message": "File uploaded successfully"
}
```

### 4. Delete File
```http
POST /api/v1/deleteFileSupabase
Content-Type: application/json

{
    "fileName": "invoice.txt",
    "isPasswordProtected": false,
    "token": "JWT_TOKEN"
}

Response:
{
    "success": true,
    "message": "File deleted successfully"
}
```

## Supabase Setup Guide

### Prerequisites
1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and API keys

### Database Schema
Create a table to store files:

```sql
CREATE TABLE files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_content TEXT NOT NULL,
    is_password_protected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, file_name)
);

-- Enable Row Level Security
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only access their own files
CREATE POLICY "Users can only access their own files"
    ON files
    FOR ALL
    USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_created_at ON files(created_at);
```

### Backend Configuration
Add Supabase credentials to your backend environment:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Security Considerations
1. **Row-Level Security**: Ensure RLS policies are properly configured
2. **API Keys**: Never expose service role keys in client-side code
3. **JWT Validation**: Validate JWT tokens on every request
4. **Encryption**: Password-protected files are encrypted client-side before upload
5. **HTTPS**: Always use HTTPS for API communication

## Benefits of Supabase

1. **Open Source**: Full transparency and community support
2. **PostgreSQL Power**: ACID compliance, complex queries, and reliability
3. **Real-time**: Built-in real-time subscriptions for live updates
4. **Scalability**: Automatic scaling with PostgreSQL
5. **Cost-Effective**: Generous free tier and competitive pricing
6. **Developer Experience**: Excellent documentation and tooling
7. **Self-Hosting**: Option to self-host for complete control

## Migration Support

Users can seamlessly migrate files between Supabase and other supported databases:

- **From Supabase**: Select files in Supabase tab and migrate to S3, PostgreSQL, Firebase, MongoDB, Neo4j, or OrbitDB
- **To Supabase**: Select files from any other database and migrate to Supabase

The migration process preserves:
- File names
- File content
- Password protection status
- Encryption (for password-protected files)

## Testing

To test the Supabase integration:

1. **Login**: Ensure you're logged in with valid credentials
2. **Navigate**: Click the cloud icon to open Cloud Storage modal
3. **Select Tab**: Click on the "⚡ Supabase" tab
4. **Upload**: Click "Upload Invoice" to save current spreadsheet
5. **View**: See the list of files stored in Supabase
6. **Edit**: Click the edit icon to load a file
7. **Delete**: Click the trash icon to remove a file
8. **Migrate**: Select files and use the migration dropdown

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Ensure JWT token is valid
   - Check if user is logged in
   - Verify backend authentication middleware

2. **Files Not Loading**
   - Check Supabase project status
   - Verify database connection
   - Check RLS policies
   - Review backend logs

3. **Upload Failed**
   - Check file size limits
   - Verify Supabase storage quota
   - Ensure proper permissions
   - Check network connectivity

4. **Migration Errors**
   - Verify source and target databases are accessible
   - Check for file name conflicts
   - Ensure sufficient storage in target database

## Future Enhancements

Potential improvements for Supabase integration:

1. **Real-time Sync**: Implement real-time file updates using Supabase subscriptions
2. **Collaborative Editing**: Multi-user editing with conflict resolution
3. **File Versioning**: Track file history and allow rollback
4. **Advanced Search**: Full-text search using PostgreSQL capabilities
5. **File Sharing**: Share files with other users with permission controls
6. **Backup Automation**: Automatic cross-database backups
7. **Analytics**: Usage statistics and insights using Supabase analytics

## Conclusion

The Supabase integration provides users with a powerful, open-source, PostgreSQL-backed storage option that combines the ease of Firebase with the power of PostgreSQL. It seamlessly integrates with the existing multi-database architecture and supports all standard operations including file management, encryption, and cross-database migration.


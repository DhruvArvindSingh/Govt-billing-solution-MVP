# API Endpoints Documentation

This document provides comprehensive documentation for all API endpoints available in the Government Billing Solution MVP.

## Base Configuration

- **Base URL**: Configured via `API_BASE_URL` from environment configuration
- **Default Headers**: 
  - `Content-Type: application/json`
- **Timeout**: 30 seconds
- **Authentication**: Bearer token stored in localStorage

## Authentication Endpoints

### 1. User Signup
- **Endpoint**: `POST /api/v1/signup`
- **Description**: Creates a new user account
- **Request Schema**:
  ```json
  {
    "email": "string",
    "password": "string",
    "name": "string (optional)",
    "other_user_fields": "any"
  }
  ```
- **Response Schema**:
  ```json
  {
    "success": "boolean",
    "authenticated": "boolean (optional)",
    "data": {
      "email": "string",
      "token": "string"
    },
    "user": "any (optional)",
    "message": "string (optional)",
    "error": "string (optional)"
  }
  ```

### 2. User Signin
- **Endpoint**: `POST /api/v1/signin`
- **Description**: Authenticates an existing user and returns a JWT token
- **Request Schema**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response Schema**:
  ```json
  {
    "success": "boolean",
    "authenticated": "boolean (optional)",
    "data": {
      "email": "string",
      "token": "string"
    },
    "user": "any (optional)",
    "message": "string (optional)",
    "error": "string (optional)"
  }
  ```
- **Side Effects**: Stores token and email in localStorage on successful authentication

### 3. Check Authentication
- **Endpoint**: `POST /api/v1/checkAuth`
- **Description**: Validates the current user's authentication token
- **Request Schema**:
  ```json
  {
    "token": "string"
  }
  ```
- **Response Schema**:
  ```json
  {
    "success": "boolean",
    "authenticated": "boolean (optional)",
    "data": {
      "email": "string",
      "token": "string"
    },
    "user": "any (optional)",
    "message": "string (optional)",
    "error": "string (optional)"
  }
  ```

## System Health Endpoint

### 4. Health Check
- **Endpoint**: `GET /api/v1/health`
- **Description**: Checks if the API server is running and responsive
- **Request Schema**: No body required
- **Response Schema**:
  ```json
  {
    "status": "string"
  }
  ```

## File Management Endpoints

### 5. Upload Logo
- **Endpoint**: `POST /api/v1/uploadLogo`
- **Description**: Uploads a logo file for the user
- **Authentication**: Required (token)
- **Request Schema**:
  ```json
  {
    "token": "string",
    "fileName": "string",
    "content": "string"
  }
  ```
- **Response Schema**:
  ```json
  {
    "success": "boolean",
    "message": "string",
    "data": {
      "fileName": "string",
      "filePath": "string",
      "email": "string",
      "signedUrl": "string",
      "url": "string"
    }
  }
  ```

### 6. Create Barcode
- **Endpoint**: `POST /api/v1/createBarCode`
- **Description**: Creates a barcode from file content
- **Authentication**: Required (token)
- **Request Schema**:
  ```json
  {
    "token": "string",
    "fileName": "string",
    "fileContent": "string",
    "isPasswordProtected": "boolean"
  }
  ```
- **Response Schema**:
  ```json
  {
    "success": "boolean",
    "message": "string",
    "data": {
      "fileName": "string",
      "filePath": "string",
      "email": "string",
      "signedUrl": "string",
      "url": "string"
    }
  }
  ```

## Database-Specific Endpoints

The application supports multiple database backends. Each database type has the same set of operations with different endpoints:

### Supported Database Types
- **S3**: Amazon S3 storage
- **Postgres**: PostgreSQL database
- **Firebase**: Firebase storage
- **Mongo**: MongoDB database
- **Neo4j**: Neo4j graph database
- **OrbitDB**: Decentralized database (handled locally, not via API)

### 7. List All Files (Per Database)

#### S3 Files
- **Endpoint**: `POST /api/v1/listAllS3`
- **Description**: Lists all files stored in S3 for the authenticated user

#### PostgreSQL Files
- **Endpoint**: `POST /api/v1/listAllPostgres`
- **Description**: Lists all files stored in PostgreSQL for the authenticated user

#### Firebase Files
- **Endpoint**: `POST /api/v1/listAllFirebase`
- **Description**: Lists all files stored in Firebase for the authenticated user

#### MongoDB Files
- **Endpoint**: `POST /api/v1/listAllMongo`
- **Description**: Lists all files stored in MongoDB for the authenticated user

#### Neo4j Files
- **Endpoint**: `POST /api/v1/listAllNeo4j`
- **Description**: Lists all files stored in Neo4j for the authenticated user

**Common Request Schema for List Operations**:
```json
{
  "token": "string"
}
```

**Common Response Schema for List Operations**:
```json
{
  "files": {
    "fileName1": "timestamp_number",
    "fileName2": "timestamp_number"
  },
  "passwordProtectedFiles": {
    "protectedFile1": "timestamp_number",
    "protectedFile2": "timestamp_number"
  }
}
```

### 8. Get File (Per Database)

#### S3 File
- **Endpoint**: `POST /api/v1/getFileS3`
- **Description**: Retrieves a specific file from S3 storage

#### PostgreSQL File
- **Endpoint**: `POST /api/v1/getFilePostgres`
- **Description**: Retrieves a specific file from PostgreSQL database

#### Firebase File
- **Endpoint**: `POST /api/v1/getFileFirebase`
- **Description**: Retrieves a specific file from Firebase storage

#### MongoDB File
- **Endpoint**: `POST /api/v1/getFileMongo`
- **Description**: Retrieves a specific file from MongoDB database

#### Neo4j File
- **Endpoint**: `POST /api/v1/getFileNeo4j`
- **Description**: Retrieves a specific file from Neo4j database

**Common Request Schema for Get File Operations**:
```json
{
  "fileName": "string",
  "isPasswordProtected": "boolean",
  "token": "string"
}
```

**Common Response Schema for Get File Operations**:
```json
{
  "success": "boolean",
  "message": "string",
  "fileName": "string",
  "isPasswordProtected": "boolean",
  "content": "string",
  "lastModified": "string (optional)",
  "contentType": "string (optional)"
}
```

### 9. Upload File (Per Database)

#### S3 Upload
- **Endpoint**: `POST /api/v1/uploadFileS3`
- **Description**: Uploads a file to S3 storage

#### PostgreSQL Upload
- **Endpoint**: `POST /api/v1/uploadFilePostgres`
- **Description**: Uploads a file to PostgreSQL database

#### Firebase Upload
- **Endpoint**: `POST /api/v1/uploadFileFirebase`
- **Description**: Uploads a file to Firebase storage

#### MongoDB Upload
- **Endpoint**: `POST /api/v1/uploadFileMongo`
- **Description**: Uploads a file to MongoDB database

#### Neo4j Upload
- **Endpoint**: `POST /api/v1/uploadFileNeo4j`
- **Description**: Uploads a file to Neo4j database

**Common Request Schema for Upload Operations**:
```json
{
  "fileName": "string",
  "fileContent": "string",
  "isPasswordProtected": "boolean",
  "token": "string"
}
```

**Common Response Schema for Upload Operations**:
```json
{
  "success": "boolean",
  "data": "any (optional)",
  "message": "string (optional)",
  "error": "string (optional)"
}
```

### 10. Delete File (Per Database)

#### S3 Delete
- **Endpoint**: `POST /api/v1/deleteFileS3`
- **Description**: Deletes a file from S3 storage

#### PostgreSQL Delete
- **Endpoint**: `POST /api/v1/deleteFilePostgres`
- **Description**: Deletes a file from PostgreSQL database

#### Firebase Delete
- **Endpoint**: `POST /api/v1/deleteFileFirebase`
- **Description**: Deletes a file from Firebase storage

#### MongoDB Delete
- **Endpoint**: `POST /api/v1/deleteFileMongo`
- **Description**: Deletes a file from MongoDB database

#### Neo4j Delete
- **Endpoint**: `POST /api/v1/deleteFileNeo4j`
- **Description**: Deletes a file from Neo4j database

**Common Request Schema for Delete Operations**:
```json
{
  "fileName": "string",
  "isPasswordProtected": "boolean",
  "token": "string"
}
```

**Common Response Schema for Delete Operations**:
```json
{
  "success": "boolean",
  "data": "any (optional)",
  "message": "string (optional)",
  "error": "string (optional)"
}
```

## Error Handling

### Common Error Responses
All endpoints may return error responses in the following format:
```json
{
  "success": false,
  "error": "string",
  "message": "string (optional)"
}
```

### HTTP Status Codes
- **200**: Success
- **401**: Unauthorized (invalid or missing token)
- **400**: Bad Request (validation errors)
- **500**: Internal Server Error

### Client-Side Error Handling
- **401 Unauthorized**: Automatically triggers logout and token removal
- **Network Errors**: Logged with full context including URL, status, and response data
- **Validation Errors**: Thrown for invalid input parameters

## Authentication Flow

1. **Login**: User provides credentials via `/api/v1/signin`
2. **Token Storage**: JWT token stored in localStorage upon successful authentication
3. **Request Authentication**: Token sent with each authenticated request
4. **Token Validation**: Server validates token for protected endpoints
5. **Token Refresh**: Use `/api/v1/checkAuth` to validate current token
6. **Logout**: Clear token from localStorage (no server-side logout endpoint)

## Special Notes

### OrbitDB Operations
OrbitDB operations are handled locally through the `OrbitDBService` and do not make HTTP requests to the server. These include:
- List files
- Get file
- Upload file  
- Delete file

### File Content Handling
- All file content is expected to be in string format
- Large file content is truncated in request logs for debugging
- File timestamps are stored as numbers (Unix timestamps)

### Security Considerations
- All file operations require authentication
- Password-protected files have additional security layer
- Tokens are validated on each request
- File access is user-scoped (users can only access their own files)

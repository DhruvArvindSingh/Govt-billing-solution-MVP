import axios, { AxiosResponse, AxiosError } from 'axios';
import { API_BASE_URL } from '../../config/environment';

// Configure axios defaults - now using centralized environment config
console.log('ApiService initialized with API_BASE_URL:', API_BASE_URL);



// Type definitions for better type safety
interface ApiResponse<T = any> {
    success?: boolean;
    data?: T;
    message?: string;
    error?: string;
}

interface S3File {
    [fileName: string]: number; // timestamp
}

interface PostgresFile {
    [fileName: string]: number; // timestamp
}

interface FirebaseFile {
    [fileName: string]: number; // timestamp
}

interface FileListResponse {
    files: { [fileName: string]: number };
    passwordProtectedFiles: { [fileName: string]: number };
}

interface FileContent {
    content: string;
    fileName?: string;
}

interface LogoUploadResponse {
    success: boolean;
    message: string;
    data: {
        fileName: string;
        filePath: string;
        email: string;
        signedUrl: string;
        url: string;
    };
}

interface AuthResponse {
    success: boolean;
    authenticated?: boolean;
    data?: {
        email: string;
        token: string;
    }
    user?: any;
    message?: string;
    error?: string;
}

// Database type for unified functions
type DatabaseType = 's3' | 'postgres' | 'firebase';

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 second timeout
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
    (config) => {
        console.log(`Making ${config.method?.toUpperCase()} request to:`, config.url);
        if (config.data) {
            console.log('Request data:', { ...config.data, content: config.data.content ? '[CONTENT_TRUNCATED]' : undefined });
        }
        return config;
    },
    (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
        console.log(`Response from ${response.config.url}:`, {
            status: response.status,
            data: response.data
        });
        return response;
    },
    (error: AxiosError) => {
        console.error('API Error:', {
            url: error.config?.url,
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });

        if (error.response?.status === 401) {
            // Handle unauthorized access
            console.warn('Unauthorized access - please login');
        }

        return Promise.reject(error);
    }
);

class ApiService {
    // Helper method to get token from localStorage only
    private static getToken(): string | null {
        return localStorage.getItem('token');
    }

    // Helper method to handle API responses consistently
    private static handleApiResponse<T>(response: AxiosResponse<T>): T {
        return response.data;
    }

    // Helper method to handle API errors consistently
    private static handleApiError(error: any, operation: string): never {
        console.error(`Failed to ${operation}:`, error);
        throw error;
    }

    // Authentication Operations
    static async signup(userData: any): Promise<AuthResponse> {
        try {
            if (!userData || typeof userData !== 'object') {
                throw new Error('Invalid user data provided');
            }

            const response = await apiClient.post<AuthResponse>('/api/v1/signup', userData);
            return this.handleApiResponse(response);
        } catch (error) {
            this.handleApiError(error, 'signup');
        }
    }

    static async signin(credentials: any): Promise<AuthResponse> {
        try {
            if (!credentials || typeof credentials !== 'object') {
                throw new Error('Invalid credentials provided');
            }
            const response = await apiClient.post<AuthResponse>('/api/v1/signin', credentials);
            console.log('signin response:', response);
            console.log('signin response data:', response.data);
            if (response.data.success && response.data.data.token) {
                // Store token in localStorage only
                console.log('signin response token:', response.data.data.token);
                localStorage.setItem('token', response.data.data.token);
                localStorage.setItem('email', response.data.data.email);
            }
            return this.handleApiResponse(response);
        } catch (error) {
            this.handleApiError(error, 'signin');
        }
    }

    static async logout(): Promise<AuthResponse> {
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('email');
            return;
        } catch (error) {
            console.error('Failed to logout:', error);
            // Clear token from localStorage even if logout fails
            // Don't throw error for logout - we still want to clear local state
            return {
                success: false,
                error: error.message || 'Logout failed',
                authenticated: false
            };
        }
    }

    // Check if user is authenticated by making a test API call
    static async checkAuth(): Promise<AuthResponse> {
        try {
            const token = this.getToken();
            if (!token) {
                return {
                    success: false,
                    authenticated: false,
                    error: 'No token found'
                };
            }

            const response = await apiClient.post<AuthResponse>('/api/v1/checkAuth', { token });
            return this.handleApiResponse(response);
        } catch (error) {
            console.error('Auth check failed:', error);
            return {
                success: false,
                authenticated: false,
                error: error.message || 'Auth check failed'
            };
        }
    }

    // Utility method to check if the API is reachable
    static async healthCheck(): Promise<{ status: string; timestamp: number }> {
        try {
            const response = await apiClient.get<{ status: string }>('/api/v1/health');
            return {
                ...this.handleApiResponse(response),
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Health check failed:', error);
            return {
                status: 'error',
                timestamp: Date.now()
            };
        }
    }

    // Logo Operations
    static async uploadLogo(fileName: string, content: string): Promise<LogoUploadResponse> {
        try {
            if (!fileName || typeof fileName !== 'string') {
                throw new Error('Invalid fileName provided');
            }

            if (typeof content !== 'string') {
                throw new Error('Invalid content provided - must be string');
            }

            const token = this.getToken();
            if (!token) {
                throw new Error('Please login to continue');
            }

            const response = await apiClient.post<LogoUploadResponse>('/api/v1/uploadLogo', {
                token,
                fileName,
                content
            });

            return this.handleApiResponse(response);
        } catch (error) {
            this.handleApiError(error, 'upload logo');
        }
    }

    // ============================================
    // UNIFIED DATABASE OPERATIONS
    // ============================================

    /**
     * Unified function to list all files from any database
     * @param database - The database type ('s3', 'dropbox', 'postgres', 'firebase')
     * @returns Promise<FileListResponse>
     */
    static async listAllFiles(database: DatabaseType): Promise<FileListResponse> {
        try {
            const token = this.getToken();
            if (!token) {
                throw new Error('Please login to continue');
            }

            let endpoint: string;
            switch (database) {
                case 's3':
                    endpoint = '/api/v1/listAllS3';
                    break;
                case 'postgres':
                    endpoint = '/api/v1/listAllPostgres';
                    break;
                case 'firebase':
                    endpoint = '/api/v1/listAllFirebase';
                    break;
                default:
                    throw new Error(`Unsupported database type: ${database}`);
            }

            const response = await apiClient.post<FileListResponse>(endpoint, { token });
            return this.handleApiResponse(response);
        } catch (error) {
            this.handleApiError(error, `list ${database} files`);
        }
    }

    /**
     * Unified function to get a file from any database
     * @param database - The database type ('s3', 'dropbox', 'postgres', 'firebase')
     * @param fileName - Name of the file to retrieve
     * @param isPasswordProtected - Whether the file is password protected
     * @returns Promise<FileContent>
     */
    static async getFile(database: DatabaseType, fileName: string, isPasswordProtected: boolean = false): Promise<FileContent> {
        try {
            console.log(`Requesting ${database} file:`, fileName);

            if (!fileName || typeof fileName !== 'string') {
                throw new Error('Invalid fileName provided');
            }
            const token = this.getToken();
            if (!token) {
                throw new Error('Please login to continue');
            }

            let endpoint: string;
            switch (database) {
                case 's3':
                    endpoint = '/api/v1/getFileS3';
                    break;
                case 'postgres':
                    endpoint = '/api/v1/getFilePostgres';
                    break;
                case 'firebase':
                    endpoint = '/api/v1/getFileFirebase';
                    break;
                default:
                    throw new Error(`Unsupported database type: ${database}`);
            }

            const response = await apiClient.post(endpoint, { fileName, isPasswordProtected, token });

            console.log(`Raw ${database} API response:`, response);
            console.log('Response data:', response.data);
            console.log('Response data type:', typeof response.data);
            console.log('Response data keys:', Object.keys(response.data || {}));

            const responseData = this.handleApiResponse(response);

            // Handle the new API response format
            if (responseData && typeof responseData === 'object' && 'content' in responseData) {
                // New format: { success, message, fileName, isPasswordProtected, content, lastModified, contentType }
                return {
                    content: responseData.content,
                    fileName: responseData.fileName || fileName
                };
            } else if (typeof responseData === 'string') {
                // If response is directly a string, treat it as content
                return { content: responseData, fileName };
            } else {
                console.error('Unexpected response structure:', responseData);
                throw new Error(`Invalid response format from ${database} API`);
            }
        } catch (error) {
            console.error('Error response:', error.response?.data);
            this.handleApiError(error, `get ${database} file`);
        }
    }

    /**
     * Unified function to upload a file to any database
     * @param database - The database type ('s3', 'dropbox', 'postgres', 'firebase')
     * @param fileName - Name of the file to upload
     * @param content - Content of the file
     * @param isPasswordProtected - Whether the file is password protected
     * @returns Promise<ApiResponse>
     */
    static async uploadFile(database: DatabaseType, fileName: string, content: string, isPasswordProtected: boolean): Promise<ApiResponse> {
        try {
            if (!fileName || typeof fileName !== 'string') {
                throw new Error('Invalid fileName provided');
            }

            if (typeof content !== 'string') {
                throw new Error('Invalid content provided - must be string');
            }

            const token = this.getToken();
            if (!token) {
                throw new Error('Please login to continue');
            }

            let endpoint: string;
            switch (database) {
                case 's3':
                    endpoint = '/api/v1/uploadFileS3';
                    break;
                case 'postgres':
                    endpoint = '/api/v1/uploadFilePostgres';
                    break;
                case 'firebase':
                    endpoint = '/api/v1/uploadFileFirebase';
                    break;
                default:
                    throw new Error(`Unsupported database type: ${database}`);
            }

            const response = await apiClient.post<ApiResponse>(endpoint, {
                fileName,
                fileContent: content,
                isPasswordProtected,
                token
            });

            return this.handleApiResponse(response);
        } catch (error) {
            this.handleApiError(error, `upload ${database} file`);
        }
    }

    /**
     * Unified function to delete a file from any database
     * @param database - The database type ('s3', 'dropbox', 'postgres', 'firebase')
     * @param fileName - Name of the file to delete
     * @param isPasswordProtected - Whether the file is password protected
     * @returns Promise<ApiResponse>
     */
    static async deleteFile(database: DatabaseType, fileName: string, isPasswordProtected: boolean = false): Promise<ApiResponse> {
        try {
            if (!fileName || typeof fileName !== 'string') {
                throw new Error('Invalid fileName provided');
            }

            const token = this.getToken();
            if (!token) {
                throw new Error('Please login to continue');
            }

            let endpoint: string;
            switch (database) {
                case 's3':
                    endpoint = '/api/v1/deleteFileS3';
                    break;
                case 'postgres':
                    endpoint = '/api/v1/deleteFilePostgres';
                    break;
                case 'firebase':
                    endpoint = '/api/v1/deleteFileFirebase';
                    break;
                default:
                    throw new Error(`Unsupported database type: ${database}`);
            }

            const response = await apiClient.post<ApiResponse>(endpoint, { fileName, isPasswordProtected, token });
            return this.handleApiResponse(response);
        } catch (error) {
            this.handleApiError(error, `delete ${database} file`);
        }
    }
}

export default ApiService;
export type { DatabaseType };

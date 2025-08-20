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

interface DropboxFile {
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

    // S3 Operations
    static async listAllS3(): Promise<FileListResponse> {
        try {
            const token = this.getToken();
            if (!token) {
                throw new Error('Please login to continue');
            }
            const response = await apiClient.post<FileListResponse>('/api/v1/listAllS3', { token });
            console.log('S3 API response:', response);
            return this.handleApiResponse(response);
        } catch (error) {
            this.handleApiError(error, 'list S3 files');
        }
    }

    static async getFileS3(fileName: string, isPasswordProtected: boolean = false): Promise<FileContent> {
        try {
            console.log('Requesting S3 file:', fileName);

            if (!fileName || typeof fileName !== 'string') {
                throw new Error('Invalid fileName provided');
            }
            const token = this.getToken();
            if (!token) {
                throw new Error('Please login to continue');
            }
            const response = await apiClient.post('/api/v1/getFileS3', { fileName, isPasswordProtected, token });

            console.log('Raw S3 API response:', response);
            console.log('Response data:', response.data);
            console.log('Response data type:', typeof response.data);
            console.log('Response data keys:', Object.keys(response.data || {}));

            const responseData = this.handleApiResponse(response);
            console.log('responseData:', responseData);

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
                throw new Error('Invalid response format from S3 API');
            }
        } catch (error) {
            console.error('Error response:', error.response?.data);
            this.handleApiError(error, 'get S3 file');
        }
    }

    static async uploadFileS3(fileName: string, content: string, isPasswordProtected: boolean): Promise<ApiResponse> {
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

            const response = await apiClient.post<ApiResponse>('/api/v1/uploadFileS3', {
                fileName,
                fileContent: content,
                isPasswordProtected,
                token
            });

            return this.handleApiResponse(response);
        } catch (error) {
            this.handleApiError(error, 'upload S3 file');
        }
    }

    static async deleteFileS3(fileName: string, isPasswordProtected: boolean = false): Promise<ApiResponse> {
        try {
            if (!fileName || typeof fileName !== 'string') {
                throw new Error('Invalid fileName provided');
            }

            const token = this.getToken();
            if (!token) {
                throw new Error('Please login to continue');
            }

            const response = await apiClient.post<ApiResponse>('/api/v1/deleteFileS3', { fileName, isPasswordProtected, token });
            return this.handleApiResponse(response);
        } catch (error) {
            this.handleApiError(error, 'delete S3 file');
        }
    }

    // Dropbox Operations
    static async listAllDropbox(): Promise<FileListResponse> {
        try {
            const token = this.getToken();
            if (!token) {
                throw new Error('Please login to continue');
            }
            const response = await apiClient.post<FileListResponse>('/api/v1/listAllDropbox', { token });
            return this.handleApiResponse(response);
        } catch (error) {
            this.handleApiError(error, 'list Dropbox files');
        }
    }

    static async getFileDropbox(fileName: string, isPasswordProtected: boolean = false): Promise<FileContent> {
        try {
            console.log('Requesting Dropbox file:', fileName);

            if (!fileName || typeof fileName !== 'string') {
                throw new Error('Invalid fileName provided');
            }
            const token = this.getToken();
            if (!token) {
                throw new Error('Please login to continue');
            }
            const response = await apiClient.post('/api/v1/getFileDropbox', { fileName, isPasswordProtected, token });

            console.log('Raw Dropbox API response:', response);
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
                throw new Error('Invalid response format from Dropbox API');
            }
        } catch (error) {
            console.error('Error response:', error.response?.data);
            this.handleApiError(error, 'get Dropbox file');
        }
    }

    static async uploadFileDropbox(fileName: string, content: string, isPasswordProtected: boolean): Promise<ApiResponse> {
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

            const response = await apiClient.post<ApiResponse>('/api/v1/uploadFileDropbox', {
                fileName,
                fileContent: content,
                isPasswordProtected,
                token
            });

            return this.handleApiResponse(response);
        } catch (error) {
            this.handleApiError(error, 'upload Dropbox file');
        }
    }

    static async deleteFileDropbox(fileName: string, isPasswordProtected: boolean = false): Promise<ApiResponse> {
        try {
            if (!fileName || typeof fileName !== 'string') {
                throw new Error('Invalid fileName provided');
            }

            const token = this.getToken();
            if (!token) {
                throw new Error('Please login to continue');
            }

            const response = await apiClient.post<ApiResponse>('/api/v1/deleteFileDropbox', { fileName, isPasswordProtected, token });
            return this.handleApiResponse(response);
        } catch (error) {
            this.handleApiError(error, 'delete Dropbox file');
        }
    }

    // PostgreSQL Operations
    static async listAllPostgres(): Promise<FileListResponse> {
        try {
            const token = this.getToken();
            if (!token) {
                throw new Error('Please login to continue');
            }
            const response = await apiClient.post<FileListResponse>('/api/v1/listAllPostgres', { token });
            return this.handleApiResponse(response);
        } catch (error) {
            this.handleApiError(error, 'list PostgreSQL files');
        }
    }

    static async getFilePostgres(fileName: string, isPasswordProtected: boolean = false): Promise<FileContent> {
        try {
            console.log('Requesting PostgreSQL file:', fileName);

            if (!fileName || typeof fileName !== 'string') {
                throw new Error('Invalid fileName provided');
            }
            const token = this.getToken();
            if (!token) {
                throw new Error('Please login to continue');
            }
            const response = await apiClient.post('/api/v1/getFilePostgres', { fileName, isPasswordProtected, token });

            console.log('Raw PostgreSQL API response:', response);
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
            }
        } catch (error) {
            console.error('Error response:', error.response?.data);
            this.handleApiError(error, 'get PostgreSQL file');
        }
    }

    static async uploadFilePostgres(fileName: string, content: string, isPasswordProtected: boolean): Promise<ApiResponse> {
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

            const response = await apiClient.post<ApiResponse>('/api/v1/uploadFilePostgres', {
                fileName,
                fileContent: content,
                isPasswordProtected,
                token
            });

            return this.handleApiResponse(response);
        } catch (error) {
            this.handleApiError(error, 'upload PostgreSQL file');
        }
    }

    static async deleteFilePostgres(fileName: string, isPasswordProtected: boolean = false): Promise<ApiResponse> {
        try {
            if (!fileName || typeof fileName !== 'string') {
                throw new Error('Invalid fileName provided');
            }

            const token = this.getToken();
            if (!token) {
                throw new Error('Please login to continue');
            }

            const response = await apiClient.post<ApiResponse>('/api/v1/deleteFilePostgres', { fileName, isPasswordProtected, token });
            return this.handleApiResponse(response);
        } catch (error) {
            this.handleApiError(error, 'delete PostgreSQL file');
        }
    }

    // Firebase Operations
    static async listAllFirebase(): Promise<FileListResponse> {
        try {
            const token = this.getToken();
            if (!token) {
                throw new Error('Please login to continue');
            }
            const response = await apiClient.post<FileListResponse>('/api/v1/listAllFirebase', { token });
            return this.handleApiResponse(response);
        } catch (error) {
            this.handleApiError(error, 'list Firebase files');
        }
    }

    static async getFileFirebase(fileName: string, isPasswordProtected: boolean = false): Promise<FileContent> {
        try {
            console.log('Requesting Firebase file:', fileName);

            if (!fileName || typeof fileName !== 'string') {
                throw new Error('Invalid fileName provided');
            }
            const token = this.getToken();
            if (!token) {
                throw new Error('Please login to continue');
            }
            const response = await apiClient.post('/api/v1/getFileFirebase', { fileName, isPasswordProtected, token });

            console.log('Raw Firebase API response:', response);
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
                throw new Error('Invalid response format from Firebase API');
            }
        } catch (error) {
            console.error('Error response:', error.response?.data);
            this.handleApiError(error, 'get Firebase file');
        }
    }

    static async uploadFileFirebase(fileName: string, content: string, isPasswordProtected: boolean): Promise<ApiResponse> {
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

            const response = await apiClient.post<ApiResponse>('/api/v1/uploadFileFirebase', {
                fileName,
                fileContent: content,
                isPasswordProtected,
                token
            });

            return this.handleApiResponse(response);
        } catch (error) {
            this.handleApiError(error, 'upload Firebase file');
        }
    }

    static async deleteFileFirebase(fileName: string, isPasswordProtected: boolean = false): Promise<ApiResponse> {
        try {
            if (!fileName || typeof fileName !== 'string') {
                throw new Error('Invalid fileName provided');
            }

            const token = this.getToken();
            if (!token) {
                throw new Error('Please login to continue');
            }

            const response = await apiClient.post<ApiResponse>('/api/v1/deleteFileFirebase', { fileName, isPasswordProtected, token });
            return this.handleApiResponse(response);
        } catch (error) {
            this.handleApiError(error, 'delete Firebase file');
        }
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
}

export default ApiService;

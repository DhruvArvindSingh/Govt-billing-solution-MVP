import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock environment
vi.mock('../../config/environment', () => ({
    API_BASE_URL: 'http://localhost:8888'
}))

// Mock axios with proper factory function
vi.mock('axios', () => {
    const mockAxiosInstance = {
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() }
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
    }

    return {
        default: {
            create: vi.fn(() => mockAxiosInstance),
            get: vi.fn(),
            post: vi.fn(),
            put: vi.fn(),
            delete: vi.fn()
        }
    }
})

// Mock the orbit service
vi.mock('./OrbitdbService', () => ({
    default: {
        uploadFile: vi.fn(),
        downloadFile: vi.fn(),
        deleteFile: vi.fn(),
        getAllFiles: vi.fn()
    }
}))

// Import after mocking
import axios from 'axios'
import ApiService from './Apiservice'

const mockedAxios = axios as any

describe('ApiService', () => {
    let mockAxiosInstance: any

    beforeEach(() => {
        vi.clearAllMocks()
        // Get the mock instance that axios.create returns
        mockAxiosInstance = (mockedAxios.create as any)()
        mockAxiosInstance.get.mockReset()
        mockAxiosInstance.post.mockReset()
        mockAxiosInstance.put.mockReset()
        mockAxiosInstance.delete.mockReset()

        // Mock localStorage globally
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: vi.fn((key) => {
                    if (key === 'token') return 'mock-token'
                    if (key === 'email') return 'test@example.com'
                    return null
                }),
                setItem: vi.fn(),
                removeItem: vi.fn()
            },
            writable: true
        })
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    describe('Authentication', () => {
        describe('signup', () => {
            it('should successfully sign up a user', async () => {
                const mockResponse = {
                    data: { success: true, message: 'User created successfully' },
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config: {} as any
                }
                mockAxiosInstance.post.mockResolvedValue(mockResponse)

                const result = await ApiService.signup({ email: 'test@example.com', password: 'password123' })

                expect(result).toEqual({ success: true, message: 'User created successfully' })
                expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/v1/signup', { email: 'test@example.com', password: 'password123' })
            })

            it('should handle signup API errors', async () => {
                const error = new Error('API Error')
                mockAxiosInstance.post.mockRejectedValue(error)

                await expect(ApiService.signup({ email: 'test@example.com', password: 'password123' }))
                    .rejects.toThrow('API Error')
            })

            it('should handle invalid signup data', async () => {
                await expect(ApiService.signup(null))
                    .rejects.toThrow('Invalid user data provided')
            })
        })

        describe('signin', () => {
            it('should successfully sign in a user and store token', async () => {
                const mockResponse = {
                    data: {
                        success: true,
                        data: {
                            email: 'test@example.com',
                            token: 'jwt-token-123'
                        }
                    },
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config: {} as any
                }
                mockAxiosInstance.post.mockResolvedValue(mockResponse)

                const result = await ApiService.signin({ email: 'test@example.com', password: 'password123' })

                expect(result).toEqual(mockResponse.data)
                expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/v1/signin', { email: 'test@example.com', password: 'password123' })
            })

            it('should handle signin API errors', async () => {
                const error = new Error('Invalid credentials')
                mockAxiosInstance.post.mockRejectedValue(error)

                await expect(ApiService.signin({ email: 'test@example.com', password: 'password123' }))
                    .rejects.toThrow('Invalid credentials')
            })

            it('should handle invalid signin data', async () => {
                await expect(ApiService.signin(null))
                    .rejects.toThrow('Invalid credentials provided')
            })
        })

        describe('logout', () => {
            it('should successfully logout and clear localStorage', async () => {
                const result = await ApiService.logout()

                expect(result).toBeUndefined()
                expect(localStorage.removeItem).toHaveBeenCalledWith('token')
                expect(localStorage.removeItem).toHaveBeenCalledWith('email')
            })
        })
    })

    describe('File Operations', () => {
        describe('uploadFile', () => {
            it('should upload file to S3', async () => {
                const mockResponse = {
                    data: { success: true, fileId: '123' },
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config: {} as any
                }
                mockAxiosInstance.post.mockResolvedValue(mockResponse)

                const result = await ApiService.uploadFile('s3', 'test.txt', 'file content', false)

                expect(result).toEqual({ success: true, fileId: '123' })
                expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/v1/uploadFileS3', {
                    fileName: 'test.txt',
                    fileContent: 'file content',
                    isPasswordProtected: false,
                    token: 'mock-token'
                })
            })

            it('should handle invalid content', async () => {
                await expect(ApiService.uploadFile('s3', 'test.txt', null as any, false))
                    .rejects.toThrow('Invalid content provided')
            })

            it('should require authentication', async () => {
                // Override localStorage to return null token
                Object.defineProperty(window, 'localStorage', {
                    value: {
                        getItem: vi.fn(() => null),
                        setItem: vi.fn(),
                        removeItem: vi.fn()
                    },
                    writable: true
                })

                await expect(ApiService.uploadFile('s3', 'test.txt', 'content', false))
                    .rejects.toThrow('Please login to continue')
            })
        })

        describe('deleteFile', () => {
            it('should handle invalid fileName', async () => {
                await expect(ApiService.deleteFile('s3', '', false))
                    .rejects.toThrow('Invalid fileName provided')
            })
        })
    })

    describe('Authentication Check', () => {
        describe('checkAuth', () => {
            it('should require authentication when no token', async () => {
                // Override localStorage to return null token
                Object.defineProperty(window, 'localStorage', {
                    value: {
                        getItem: vi.fn(() => null),
                        setItem: vi.fn(),
                        removeItem: vi.fn()
                    },
                    writable: true
                })

                const result = await ApiService.checkAuth()
                expect(result.success).toBe(false)
                expect(result.authenticated).toBe(false)
            })
        })
    })
})
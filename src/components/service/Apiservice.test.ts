import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ApiService from './Apiservice'
import axios from 'axios'

// Mock axios
vi.mock('axios')
const mockedAxios = axios as any

// Mock environment
vi.mock('../../config/environment', () => ({
    API_BASE_URL: 'http://localhost:8888'
}))

// Mock localStorage
const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
})

describe('ApiService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockLocalStorage.getItem.mockReturnValue('mock-token')
        mockLocalStorage.setItem.mockImplementation(() => { })
        mockLocalStorage.removeItem.mockImplementation(() => { })
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('Authentication Operations', () => {
        describe('signup', () => {
            it('should successfully sign up a user', async () => {
                const mockResponse = {
                    data: { success: true, message: 'User created successfully' }
                }
                mockedAxios.create.mockReturnValue({
                    post: vi.fn().mockResolvedValue(mockResponse)
                })

                const result = await ApiService.signup({ email: 'test@example.com', password: 'password123' })

                expect(result).toEqual({ success: true, message: 'User created successfully' })
            })

            it('should throw error for invalid user data', async () => {
                await expect(ApiService.signup(null as any)).rejects.toThrow('Invalid user data provided')
            })

            it('should handle signup API errors', async () => {
                const error = new Error('API Error')
                mockedAxios.create.mockReturnValue({
                    post: vi.fn().mockRejectedValue(error)
                })

                await expect(ApiService.signup({ email: 'test@example.com', password: 'password123' }))
                    .rejects.toThrow('API Error')
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
                    }
                }
                mockedAxios.create.mockReturnValue({
                    post: vi.fn().mockResolvedValue(mockResponse)
                })

                const result = await ApiService.signin({ email: 'test@example.com', password: 'password123' })

                expect(result).toEqual(mockResponse.data)
                expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'jwt-token-123')
                expect(mockLocalStorage.setItem).toHaveBeenCalledWith('email', 'test@example.com')
            })

            it('should throw error for invalid credentials', async () => {
                await expect(ApiService.signin(null as any)).rejects.toThrow('Invalid credentials provided')
            })

            it('should handle signin API errors', async () => {
                const error = new Error('Invalid credentials')
                mockedAxios.create.mockReturnValue({
                    post: vi.fn().mockRejectedValue(error)
                })

                await expect(ApiService.signin({ email: 'test@example.com', password: 'password123' }))
                    .rejects.toThrow('Invalid credentials')
            })
        })

        describe('logout', () => {
            it('should successfully logout and clear localStorage', async () => {
                const result = await ApiService.logout()

                expect(result).toBeUndefined()
                expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
                expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('email')
            })

            it('should handle logout errors gracefully', async () => {
                mockLocalStorage.removeItem.mockImplementation(() => {
                    throw new Error('Storage error')
                })

                const result = await ApiService.logout()

                expect(result).toEqual({
                    success: false,
                    error: 'Storage error',
                    authenticated: false
                })
            })
        })

        describe('checkAuth', () => {
            it('should return false when no token is found', async () => {
                mockLocalStorage.getItem.mockReturnValue(null)

                const result = await ApiService.checkAuth()

                expect(result).toEqual({
                    success: false,
                    authenticated: false,
                    error: 'No token found'
                })
            })

            it('should successfully check authentication with valid token', async () => {
                const mockResponse = {
                    data: { success: true, authenticated: true }
                }
                mockedAxios.create.mockReturnValue({
                    post: vi.fn().mockResolvedValue(mockResponse)
                })

                const result = await ApiService.checkAuth()

                expect(result).toEqual({ success: true, authenticated: true })
            })

            it('should handle auth check API errors', async () => {
                const error = new Error('Auth failed')
                mockedAxios.create.mockReturnValue({
                    post: vi.fn().mockRejectedValue(error)
                })

                const result = await ApiService.checkAuth()

                expect(result).toEqual({
                    success: false,
                    authenticated: false,
                    error: 'Auth failed'
                })
            })
        })
    })

    describe('Health Check', () => {
        it('should successfully perform health check', async () => {
            const mockResponse = {
                data: { status: 'ok' }
            }
            mockedAxios.create.mockReturnValue({
                get: vi.fn().mockResolvedValue(mockResponse)
            })

            const result = await ApiService.healthCheck()

            expect(result.status).toBe('ok')
            expect(typeof result.timestamp).toBe('number')
        })

        it('should handle health check errors', async () => {
            const error = new Error('Health check failed')
            mockedAxios.create.mockReturnValue({
                get: vi.fn().mockRejectedValue(error)
            })

            const result = await ApiService.healthCheck()

            expect(result.status).toBe('error')
            expect(typeof result.timestamp).toBe('number')
        })
    })

    describe('Logo Operations', () => {
        describe('uploadLogo', () => {
            it('should successfully upload logo', async () => {
                const mockResponse = {
                    data: {
                        success: true,
                        message: 'Logo uploaded successfully',
                        data: {
                            fileName: 'logo.png',
                            signedUrl: 'https://example.com/logo.png'
                        }
                    }
                }
                mockedAxios.create.mockReturnValue({
                    post: vi.fn().mockResolvedValue(mockResponse)
                })

                const result = await ApiService.uploadLogo('logo.png', 'base64content')

                expect(result).toEqual(mockResponse.data)
            })

            it('should throw error for invalid fileName', async () => {
                await expect(ApiService.uploadLogo('', 'base64content')).rejects.toThrow('Invalid fileName provided')
                await expect(ApiService.uploadLogo(null as any, 'base64content')).rejects.toThrow('Invalid fileName provided')
            })

            it('should throw error for invalid content', async () => {
                await expect(ApiService.uploadLogo('logo.png', null as any)).rejects.toThrow('Invalid content provided - must be string')
            })

            it('should throw error when no token is available', async () => {
                mockLocalStorage.getItem.mockReturnValue(null)

                await expect(ApiService.uploadLogo('logo.png', 'base64content')).rejects.toThrow('Please login to continue')
            })

            it('should handle upload logo API errors', async () => {
                const error = new Error('Upload failed')
                mockedAxios.create.mockReturnValue({
                    post: vi.fn().mockRejectedValue(error)
                })

                await expect(ApiService.uploadLogo('logo.png', 'base64content')).rejects.toThrow('Upload failed')
            })
        })
    })

    describe('File Operations', () => {
        describe('listAllFiles', () => {
            it('should successfully list files from S3', async () => {
                const mockResponse = {
                    data: {
                        files: { 'file1.txt': 1234567890 },
                        passwordProtectedFiles: { 'protected.txt': 1234567890 }
                    }
                }
                mockedAxios.create.mockReturnValue({
                    post: vi.fn().mockResolvedValue(mockResponse)
                })

                const result = await ApiService.listAllFiles('s3')

                expect(result).toEqual(mockResponse.data)
            })

            it('should successfully list files from Dropbox', async () => {
                const mockResponse = {
                    data: {
                        files: { 'file1.txt': 1234567890 },
                        passwordProtectedFiles: {}
                    }
                }
                mockedAxios.create.mockReturnValue({
                    post: vi.fn().mockResolvedValue(mockResponse)
                })

                const result = await ApiService.listAllFiles('dropbox')

                expect(result).toEqual(mockResponse.data)
            })

            it('should throw error when no token is available', async () => {
                mockLocalStorage.getItem.mockReturnValue(null)

                await expect(ApiService.listAllFiles('s3')).rejects.toThrow('Please login to continue')
            })

            it('should throw error for unsupported database type', async () => {
                await expect(ApiService.listAllFiles('unsupported' as any)).rejects.toThrow('Unsupported database type: unsupported')
            })

            it('should handle list files API errors', async () => {
                const error = new Error('List files failed')
                mockedAxios.create.mockReturnValue({
                    post: vi.fn().mockRejectedValue(error)
                })

                await expect(ApiService.listAllFiles('s3')).rejects.toThrow('List files failed')
            })
        })

        describe('getFile', () => {
            it('should successfully get file from S3', async () => {
                const mockResponse = {
                    data: {
                        content: 'file content',
                        fileName: 'test.txt'
                    }
                }
                mockedAxios.create.mockReturnValue({
                    post: vi.fn().mockResolvedValue(mockResponse)
                })

                const result = await ApiService.getFile('s3', 'test.txt', false)

                expect(result).toEqual({
                    content: 'file content',
                    fileName: 'test.txt'
                })
            })

            it('should handle string response format', async () => {
                const mockResponse = {
                    data: 'file content string'
                }
                mockedAxios.create.mockReturnValue({
                    post: vi.fn().mockResolvedValue(mockResponse)
                })

                const result = await ApiService.getFile('s3', 'test.txt', false)

                expect(result).toEqual({
                    content: 'file content string',
                    fileName: 'test.txt'
                })
            })

            it('should throw error for invalid fileName', async () => {
                await expect(ApiService.getFile('s3', '', false)).rejects.toThrow('Invalid fileName provided')
                await expect(ApiService.getFile('s3', null as any, false)).rejects.toThrow('Invalid fileName provided')
            })

            it('should throw error when no token is available', async () => {
                mockLocalStorage.getItem.mockReturnValue(null)

                await expect(ApiService.getFile('s3', 'test.txt', false)).rejects.toThrow('Please login to continue')
            })

            it('should handle get file API errors', async () => {
                const error = new Error('Get file failed')
                mockedAxios.create.mockReturnValue({
                    post: vi.fn().mockRejectedValue(error)
                })

                await expect(ApiService.getFile('s3', 'test.txt', false)).rejects.toThrow('Get file failed')
            })
        })

        describe('uploadFile', () => {
            it('should successfully upload file to S3', async () => {
                const mockResponse = {
                    data: { success: true, message: 'File uploaded successfully' }
                }
                mockedAxios.create.mockReturnValue({
                    post: vi.fn().mockResolvedValue(mockResponse)
                })

                const result = await ApiService.uploadFile('s3', 'test.txt', 'file content', false)

                expect(result).toEqual(mockResponse.data)
            })

            it('should throw error for invalid fileName', async () => {
                await expect(ApiService.uploadFile('s3', '', 'content', false)).rejects.toThrow('Invalid fileName provided')
                await expect(ApiService.uploadFile('s3', null as any, 'content', false)).rejects.toThrow('Invalid fileName provided')
            })

            it('should throw error for invalid content', async () => {
                await expect(ApiService.uploadFile('s3', 'test.txt', null as any, false)).rejects.toThrow('Invalid content provided - must be string')
            })

            it('should throw error when no token is available', async () => {
                mockLocalStorage.getItem.mockReturnValue(null)

                await expect(ApiService.uploadFile('s3', 'test.txt', 'content', false)).rejects.toThrow('Please login to continue')
            })

            it('should handle upload file API errors', async () => {
                const error = new Error('Upload failed')
                mockedAxios.create.mockReturnValue({
                    post: vi.fn().mockRejectedValue(error)
                })

                await expect(ApiService.uploadFile('s3', 'test.txt', 'content', false)).rejects.toThrow('Upload failed')
            })
        })

        describe('deleteFile', () => {
            it('should successfully delete file from S3', async () => {
                const mockResponse = {
                    data: { success: true, message: 'File deleted successfully' }
                }
                mockedAxios.create.mockReturnValue({
                    post: vi.fn().mockResolvedValue(mockResponse)
                })

                const result = await ApiService.deleteFile('s3', 'test.txt', false)

                expect(result).toEqual(mockResponse.data)
            })

            it('should throw error for invalid fileName', async () => {
                await expect(ApiService.deleteFile('s3', '', false)).rejects.toThrow('Invalid fileName provided')
                await expect(ApiService.deleteFile('s3', null as any, false)).rejects.toThrow('Invalid fileName provided')
            })

            it('should throw error when no token is available', async () => {
                mockLocalStorage.getItem.mockReturnValue(null)

                await expect(ApiService.deleteFile('s3', 'test.txt', false)).rejects.toThrow('Please login to continue')
            })

            it('should handle delete file API errors', async () => {
                const error = new Error('Delete failed')
                mockedAxios.create.mockReturnValue({
                    post: vi.fn().mockRejectedValue(error)
                })

                await expect(ApiService.deleteFile('s3', 'test.txt', false)).rejects.toThrow('Delete failed')
            })
        })
    })

    describe('Error Handling', () => {
        it('should handle axios errors with response data', async () => {
            const error = {
                response: {
                    status: 404,
                    data: { message: 'Not found' }
                },
                message: 'Request failed'
            }
            mockedAxios.create.mockReturnValue({
                post: vi.fn().mockRejectedValue(error)
            })

            await expect(ApiService.signin({ email: 'test@example.com', password: 'password123' }))
                .rejects.toThrow('Request failed')
        })

        it('should handle network errors', async () => {
            const error = {
                code: 'NETWORK_ERROR',
                message: 'Network Error'
            }
            mockedAxios.create.mockReturnValue({
                post: vi.fn().mockRejectedValue(error)
            })

            await expect(ApiService.signin({ email: 'test@example.com', password: 'password123' }))
                .rejects.toThrow('Network Error')
        })
    })

    describe('Interceptors', () => {
        it('should add request interceptor for logging', async () => {
            const mockPost = vi.fn().mockResolvedValue({ data: { success: true } })
            const mockCreate = vi.fn().mockReturnValue({
                post: mockPost,
                interceptors: {
                    request: { use: vi.fn() },
                    response: { use: vi.fn() }
                }
            })

            mockedAxios.create.mockImplementation(mockCreate)

            await ApiService.signin({ email: 'test@example.com', password: 'password123' })

            expect(mockCreate).toHaveBeenCalled()
        })
    })

    describe('Token Management', () => {
        it('should get token from localStorage', () => {
            mockLocalStorage.getItem.mockReturnValue('test-token')

            // Access private method through public API
            const result = ApiService['getToken']()

            expect(result).toBe('test-token')
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith('token')
        })

        it('should return null when no token in localStorage', () => {
            mockLocalStorage.getItem.mockReturnValue(null)

            const result = ApiService['getToken']()

            expect(result).toBeNull()
        })
    })
})

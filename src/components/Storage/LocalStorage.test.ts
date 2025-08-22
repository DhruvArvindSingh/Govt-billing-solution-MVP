import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Local, File } from './LocalStorage'
import { Preferences } from '@capacitor/preferences'

// Mock Preferences
vi.mock('@capacitor/preferences', () => ({
    Preferences: {
        set: vi.fn(),
        get: vi.fn(),
        remove: vi.fn(),
        keys: vi.fn(),
        clear: vi.fn()
    }
}))

describe('LocalStorage', () => {
    let localStorage: Local

    beforeEach(() => {
        vi.clearAllMocks()
        localStorage = new Local()
    })

    describe('File Class', () => {
        it('should create a File instance with all properties', () => {
            const file = new File(
                '2023-01-01',
                '2023-01-02',
                'file content',
                'test.txt',
                1,
                true,
                'password123'
            )

            expect(file.created).toBe('2023-01-01')
            expect(file.modified).toBe('2023-01-02')
            expect(file.content).toBe('file content')
            expect(file.name).toBe('test.txt')
            expect(file.billType).toBe(1)
            expect(file.isPasswordProtected).toBe(true)
            expect(file.password).toBe('password123')
        })

        it('should create a File instance with default values', () => {
            const file = new File(
                '2023-01-01',
                '2023-01-02',
                'file content',
                'test.txt',
                1
            )

            expect(file.isPasswordProtected).toBe(false)
            expect(file.password).toBeUndefined()
        })
    })

    describe('Encryption/Decryption', () => {
        it('should encrypt content successfully', () => {
            const content = 'test content'
            const password = 'password123'

            // Access private method through type assertion
            const encrypted = (localStorage as any)._encryptContent(content, password)

            expect(typeof encrypted).toBe('string')
            expect(encrypted).not.toBe(content)
            expect(encrypted.length).toBeGreaterThan(0)
        })

        it('should decrypt content successfully', () => {
            const content = 'test content'
            const password = 'password123'

            const encrypted = (localStorage as any)._encryptContent(content, password)
            const decrypted = (localStorage as any)._decryptContent(encrypted, password)

            expect(decrypted).toBe(content)
        })

        it('should handle old format decryption with Protected_ prefix', () => {
            const content = 'test content'
            const password = 'password123'

            const encrypted = (localStorage as any)._encryptContent(content, password)
            const oldFormat = 'Protected_' + encrypted
            const decrypted = (localStorage as any)._decryptContent(oldFormat, password)

            expect(decrypted).toBe(content)
        })

        it('should throw error for invalid password during decryption', () => {
            const content = 'test content'
            const password = 'password123'
            const wrongPassword = 'wrong-password'

            const encrypted = (localStorage as any)._encryptContent(content, password)

            expect(() => {
                (localStorage as any)._decryptContent(encrypted, wrongPassword)
            }).toThrow('Failed to decrypt file. Invalid password or corrupted file.')
        })

        it('should identify protected files with old format', () => {
            const protectedContent = 'Protected_encryptedcontent'
            const regularContent = 'regular content'

            expect(localStorage.isProtectedFile(protectedContent)).toBe(true)
            expect(localStorage.isProtectedFile(regularContent)).toBe(false)
        })
    })

    describe('File Operations', () => {
        describe('_saveFile', () => {
            it('should save regular file successfully', async () => {
                const mockPreferences = Preferences as any
                mockPreferences.set.mockResolvedValue(undefined)

                const file = new File(
                    '2023-01-01',
                    '2023-01-02',
                    'file content',
                    'test.txt',
                    1,
                    false
                )

                await localStorage._saveFile(file)

                expect(mockPreferences.set).toHaveBeenCalledWith({
                    key: 'test.txt',
                    value: JSON.stringify({
                        created: '2023-01-01',
                        modified: '2023-01-02',
                        content: 'file content',
                        name: 'test.txt',
                        billType: 1,
                        isPasswordProtected: false,
                        password: null
                    })
                })
            })

            it('should save protected file with encryption', async () => {
                const mockPreferences = Preferences as any
                mockPreferences.set.mockResolvedValue(undefined)

                const file = new File(
                    '2023-01-01',
                    '2023-01-02',
                    'file content',
                    'test.txt',
                    1,
                    true,
                    'password123'
                )

                await localStorage._saveFile(file)

                expect(mockPreferences.set).toHaveBeenCalledWith({
                    key: 'test.txt',
                    value: expect.stringContaining('test.txt')
                })

                const savedData = JSON.parse(mockPreferences.set.mock.calls[0][0].value)
                expect(savedData.isPasswordProtected).toBe(true)
                expect(savedData.content).not.toBe('file content') // Should be encrypted
            })

            it('should skip encryption when needEncrypt is false', async () => {
                const mockPreferences = Preferences as any
                mockPreferences.set.mockResolvedValue(undefined)

                const file = new File(
                    '2023-01-01',
                    '2023-01-02',
                    'file content',
                    'test.txt',
                    1,
                    true,
                    'password123'
                )

                await localStorage._saveFile(file, false)

                const savedData = JSON.parse(mockPreferences.set.mock.calls[0][0].value)
                expect(savedData.content).toBe('file content') // Should not be encrypted
            })

            it('should handle save errors', async () => {
                const mockPreferences = Preferences as any
                mockPreferences.set.mockRejectedValue(new Error('Storage error'))

                const file = new File(
                    '2023-01-01',
                    '2023-01-02',
                    'file content',
                    'test.txt',
                    1,
                    false
                )

                await expect(localStorage._saveFile(file)).rejects.toThrow('Storage error')
            })
        })

        describe('_saveProtectedFile', () => {
            it('should save protected file correctly', async () => {
                const mockPreferences = Preferences as any
                mockPreferences.set.mockResolvedValue(undefined)

                const file = new File(
                    '2023-01-01',
                    '2023-01-02',
                    'file content',
                    'test.txt',
                    1,
                    false
                )

                await localStorage._saveProtectedFile(file, 'password123')

                expect(mockPreferences.set).toHaveBeenCalled()
                const savedData = JSON.parse(mockPreferences.set.mock.calls[0][0].value)
                expect(savedData.isPasswordProtected).toBe(true)
                expect(savedData.content).not.toBe('file content') // Should be encrypted
            })
        })

        describe('_getFile', () => {
            it('should get file successfully', async () => {
                const mockPreferences = Preferences as any
                const fileData = {
                    created: '2023-01-01',
                    modified: '2023-01-02',
                    content: 'file content',
                    name: 'test.txt',
                    billType: 1,
                    isPasswordProtected: false
                }
                mockPreferences.get.mockResolvedValue({ value: JSON.stringify(fileData) })

                const result = await localStorage._getFile('test.txt')

                expect(result).toEqual(fileData)
            })

            it('should handle get file errors', async () => {
                const mockPreferences = Preferences as any
                mockPreferences.get.mockRejectedValue(new Error('Storage error'))

                await expect(localStorage._getFile('test.txt')).rejects.toThrow('Storage error')
            })
        })

        describe('_getFileWithPassword', () => {
            it('should get unprotected file without password', async () => {
                const mockPreferences = Preferences as any
                const fileData = {
                    created: '2023-01-01',
                    modified: '2023-01-02',
                    content: 'file content',
                    name: 'test.txt',
                    billType: 1,
                    isPasswordProtected: false
                }
                mockPreferences.get.mockResolvedValue({ value: JSON.stringify(fileData) })

                const result = await localStorage._getFileWithPassword('test.txt')

                expect(result).toEqual({
                    ...fileData,
                    isPasswordProtected: false,
                    password: null
                })
            })

            it('should decrypt protected file with correct password', async () => {
                const content = 'secret content'
                const password = 'password123'
                const encryptedContent = (localStorage as any)._encryptContent(content, password)

                const mockPreferences = Preferences as any
                const fileData = {
                    created: '2023-01-01',
                    modified: '2023-01-02',
                    content: encryptedContent,
                    name: 'test.txt',
                    billType: 1,
                    isPasswordProtected: true
                }
                mockPreferences.get.mockResolvedValue({ value: JSON.stringify(fileData) })

                const result = await localStorage._getFileWithPassword('test.txt', password)

                expect(result.content).toBe(content)
                expect(result.isPasswordProtected).toBe(true)
                expect(result.password).toBe(password)
            })

            it('should throw error for protected file without password', async () => {
                const mockPreferences = Preferences as any
                const fileData = {
                    created: '2023-01-01',
                    modified: '2023-01-02',
                    content: 'encrypted content',
                    name: 'test.txt',
                    billType: 1,
                    isPasswordProtected: true
                }
                mockPreferences.get.mockResolvedValue({ value: JSON.stringify(fileData) })

                await expect(localStorage._getFileWithPassword('test.txt')).rejects.toThrow('Password required for protected file')
            })

            it('should handle old format protected files', async () => {
                const content = 'secret content'
                const password = 'password123'
                const encryptedContent = (localStorage as any)._encryptContent(content, password)
                const oldFormatContent = 'Protected_' + encryptedContent

                const mockPreferences = Preferences as any
                const fileData = {
                    created: '2023-01-01',
                    modified: '2023-01-02',
                    content: oldFormatContent,
                    name: 'test.txt',
                    billType: 1,
                    isPasswordProtected: false
                }
                mockPreferences.get.mockResolvedValue({ value: JSON.stringify(fileData) })

                const result = await localStorage._getFileWithPassword('test.txt', password)

                expect(result.content).toBe(content)
                expect(result.isPasswordProtected).toBe(true)
                expect(result.password).toBe(password)
            })
        })

        describe('_getProtectedFile', () => {
            it('should get protected file correctly', async () => {
                const mockPreferences = Preferences as any
                const fileData = {
                    created: '2023-01-01',
                    modified: '2023-01-02',
                    content: 'encrypted content',
                    name: 'test.txt',
                    billType: 1,
                    isPasswordProtected: true
                }
                mockPreferences.get.mockResolvedValue({ value: JSON.stringify(fileData) })

                // Mock the _getFileWithPassword method
                const mockGetFileWithPassword = vi.fn().mockResolvedValue({
                    ...fileData,
                    isPasswordProtected: true,
                    password: 'password123'
                })
                localStorage._getFileWithPassword = mockGetFileWithPassword

                const result = await localStorage._getProtectedFile('test.txt', 'password123')

                expect(mockGetFileWithPassword).toHaveBeenCalledWith('test.txt', 'password123')
                expect(result).toEqual({
                    ...fileData,
                    isPasswordProtected: true,
                    password: 'password123'
                })
            })
        })

        describe('_getAllFiles', () => {
            it('should get all files successfully', async () => {
                const mockPreferences = Preferences as any
                mockPreferences.keys.mockResolvedValue({
                    keys: ['file1.txt', 'file2.txt', '__last_opened_file__']
                })
                mockPreferences.get
                    .mockResolvedValueOnce({
                        value: JSON.stringify({
                            created: '2023-01-01',
                            modified: '2023-01-02',
                            content: 'content1',
                            name: 'file1.txt',
                            billType: 1,
                            isPasswordProtected: false
                        })
                    })
                    .mockRejectedValueOnce(new Error('Invalid JSON')) // This will be skipped
                    .mockResolvedValueOnce({
                        value: JSON.stringify({
                            lastOpenedFile: 'file1.txt'
                        })
                    }) // This will be skipped

                const result = await localStorage._getAllFiles()

                expect(result).toEqual({
                    'file1.txt': '2023-01-02'
                })
            })

            it('should skip invalid file entries', async () => {
                const mockPreferences = Preferences as any
                mockPreferences.keys.mockResolvedValue({
                    keys: ['valid.txt', 'invalid.txt']
                })
                mockPreferences.get
                    .mockResolvedValueOnce({
                        value: JSON.stringify({
                            created: '2023-01-01',
                            modified: '2023-01-02',
                            content: 'content',
                            name: 'valid.txt',
                            billType: 1,
                            isPasswordProtected: false
                        })
                    })
                    .mockResolvedValueOnce({
                        value: JSON.stringify({
                            created: '2023-01-01',
                            modified: '2023-01-04',
                            content: 'content2',
                            name: 'invalid.txt',
                            billType: 1,
                            isPasswordProtected: false
                        })
                    })

                const result = await localStorage._getAllFiles()

                expect(result).toEqual({
                    'valid.txt': '2023-01-02',
                    'invalid.txt': '2023-01-04'
                })
            })

            it('should skip metadata keys', async () => {
                const mockPreferences = Preferences as any
                mockPreferences.keys.mockResolvedValue({
                    keys: ['__last_opened_file__']
                })

                const result = await localStorage._getAllFiles()

                expect(result).toEqual({})
            })
        })

        describe('_deleteFile', () => {
            it('should delete file successfully', async () => {
                const mockPreferences = Preferences as any
                mockPreferences.remove.mockResolvedValue(undefined)

                await localStorage._deleteFile('test.txt')

                expect(mockPreferences.remove).toHaveBeenCalledWith({ key: 'test.txt' })
            })
        })

        describe('_checkKey', () => {
            it('should return true if key exists', async () => {
                const mockPreferences = Preferences as any
                mockPreferences.keys.mockResolvedValue({
                    keys: ['file1.txt', 'file2.txt', 'test.txt']
                })

                const result = await localStorage._checkKey('test.txt')

                expect(result).toBe(true)
            })

            it('should return false if key does not exist', async () => {
                const mockPreferences = Preferences as any
                mockPreferences.keys.mockResolvedValue({
                    keys: ['file1.txt', 'file2.txt']
                })

                const result = await localStorage._checkKey('test.txt')

                expect(result).toBe(false)
            })
        })

        describe('Last Opened File', () => {
            describe('_getLastOpenedFile', () => {
                it('should return last opened file', async () => {
                    const mockPreferences = Preferences as any
                    mockPreferences.get.mockResolvedValue({ value: 'test.txt' })

                    const result = await localStorage._getLastOpenedFile()

                    expect(result).toBe('test.txt')
                    expect(mockPreferences.get).toHaveBeenCalledWith({ key: '__last_opened_file__' })
                })

                it('should return null if no last opened file', async () => {
                    const mockPreferences = Preferences as any
                    mockPreferences.get.mockResolvedValue({ value: null })

                    const result = await localStorage._getLastOpenedFile()

                    expect(result).toBe(null)
                })

                it('should return null on error', async () => {
                    const mockPreferences = Preferences as any
                    mockPreferences.get.mockRejectedValue(new Error('Storage error'))

                    const result = await localStorage._getLastOpenedFile()

                    expect(result).toBe(null)
                })
            })

            describe('_clearLastOpenedFile', () => {
                it('should clear last opened file', async () => {
                    const mockPreferences = Preferences as any
                    mockPreferences.remove.mockResolvedValue(undefined)

                    await localStorage._clearLastOpenedFile()

                    expect(mockPreferences.remove).toHaveBeenCalledWith({ key: '__last_opened_file__' })
                })
            })
        })
    })

    describe('Protected File Detection', () => {
        describe('isFileProtected', () => {
            it('should return true for new format protected file', async () => {
                const mockPreferences = Preferences as any
                mockPreferences.get.mockResolvedValue({
                    value: JSON.stringify({
                        isPasswordProtected: true,
                        content: 'content'
                    })
                })

                const result = await localStorage.isFileProtected('test.txt')

                expect(result).toBe(true)
            })

            it('should return true for old format protected file', async () => {
                const mockPreferences = Preferences as any
                mockPreferences.get.mockResolvedValue({
                    value: JSON.stringify({
                        isPasswordProtected: false,
                        content: 'Protected_encryptedcontent'
                    })
                })

                const result = await localStorage.isFileProtected('test.txt')

                expect(result).toBe(true)
            })

            it('should return false for unprotected file', async () => {
                const mockPreferences = Preferences as any
                mockPreferences.get.mockResolvedValue({
                    value: JSON.stringify({
                        isPasswordProtected: false,
                        content: 'regular content'
                    })
                })

                const result = await localStorage.isFileProtected('test.txt')

                expect(result).toBe(false)
            })

            it('should return false on error', async () => {
                const mockPreferences = Preferences as any
                mockPreferences.get.mockRejectedValue(new Error('Storage error'))

                const result = await localStorage.isFileProtected('test.txt')

                expect(result).toBe(false)
            })
        })
    })
})

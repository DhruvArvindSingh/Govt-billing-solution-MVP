import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Files from './Files'

// Mock Ionic components for testing
vi.mock('@ionic/react', () => ({
    IonIcon: ({ icon, slot, size, onClick, title }: any) => (
        <div
            data-testid={`ion-icon-${icon}`}
            slot={slot}
            onClick={onClick}
            style={{
                cursor: 'pointer',
                fontSize: size || 'inherit'
            }}
            data-icon={icon}
            title={title}
        >
            {icon}
        </div>
    ),
    IonModal: ({ children, isOpen, onDidDismiss }: any) => {
        if (!isOpen) return null
        return (
            <div data-testid="ion-modal">
                {children}
            </div>
        )
    },
    IonHeader: ({ children }: any) => <div data-testid="ion-header">{children}</div>,
    IonToolbar: ({ children }: any) => <div data-testid="ion-toolbar">{children}</div>,
    IonTitle: ({ children }: any) => <div data-testid="ion-title">{children}</div>,
    IonContent: ({ children }: any) => <div data-testid="ion-content">{children}</div>,
    IonItem: ({ children }: any) => <div data-testid="ion-item">{children}</div>,
    IonList: ({ children }: any) => <div data-testid="ion-list">{children}</div>,
    IonLabel: ({ children }: any) => <label>{children}</label>,
    IonInput: ({ value, placeholder, onIonInput, type }: any) => (
        <input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onIonInput && onIonInput({ detail: { value: e.target.value } })}
        />
    ),
    IonButton: ({ children, onClick, disabled, expand, fill, color, slot }: any) => (
        <button
            onClick={onClick}
            disabled={disabled}
            data-expand={expand}
            data-fill={fill}
            data-color={color}
            slot={slot}
        >
            {children}
        </button>
    ),
    IonCheckbox: ({ checked, onIonChange, slot }: any) => (
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onIonChange && onIonChange({ detail: { checked: e.target.checked } })}
            slot={slot}
        />
    ),
    IonSearchbar: ({ value, placeholder, onIonInput, debounce }: any) => (
        <input
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onIonInput && onIonInput({ detail: { value: e.target.value } })}
            data-debounce={debounce}
        />
    ),
    IonToast: ({ children, isOpen, onDidDismiss, message, duration, position }: any) => {
        if (!isOpen) return null
        return (
            <div data-testid="ion-toast" data-position={position}>
                {message || children}
            </div>
        )
    },
    IonAlert: ({ children, isOpen, onDidDismiss, header, message, buttons }: any) => {
        if (!isOpen) return null
        return (
            <div data-testid="ion-alert">
                <h2>{header}</h2>
                <p>{message}</p>
                {buttons?.map((button: any, index: number) => (
                    <button
                        key={index}
                        onClick={button.handler}
                        data-role={button.role}
                    >
                        {button.text}
                    </button>
                ))}
            </div>
        )
    }
}))

// Mock dependencies
vi.mock('../socialcalc/index.js', () => ({
    default: {
        getDeviceType: vi.fn(() => 'default'),
        viewFile: vi.fn()
    }
}))

vi.mock('../../app-data.js', () => ({
    DATA: {
        home: {
            default: {
                msc: 'mock-msc-data'
            }
        }
    }
}))

vi.mock('../service/Apiservice', () => ({
    default: {
        uploadFile: vi.fn()
    }
}))

vi.mock('../PasswordModal/PasswordModal', () => ({
    default: ({ isOpen, onClose, onSubmit, title, submitText, showNameField, passwordError }: any) => {
        if (!isOpen) return null

        return (
            <div data-testid="password-modal">
                <h2>{title}</h2>
                <button onClick={onClose}>Close</button>
                <button onClick={() => onSubmit('test-file', 'password123')}>{submitText}</button>
                {passwordError && <p data-testid="password-error">{passwordError}</p>}
            </div>
        )
    }
}))

// Mock LocalStorage
const mockLocalStorage = {
    // Private methods (used internally)
    _encryptContent: vi.fn((content: string, password: string) => `encrypted_${content}`),
    _decryptContent: vi.fn((encryptedContent: string, password: string) => encryptedContent.replace('encrypted_', '')),

    // Public methods
    isProtectedFile: vi.fn((content: string) => content.startsWith('Protected_')),
    isFileProtected: vi.fn(async (fileName: string) => false),

    // Storage methods
    _saveFile: vi.fn(async (file: any, needEncrypt?: boolean) => { }),
    _saveProtectedFile: vi.fn(async (file: any, password: string) => { }),
    _getFile: vi.fn(async (name: string) => ({
        created: '2023-01-01',
        modified: '2023-01-01',
        content: 'file content',
        name: name,
        billType: 1,
        isPasswordProtected: false
    })),
    _getFileWithPassword: vi.fn(async (name: string, password?: string) => ({
        created: '2023-01-01',
        modified: '2023-01-01',
        content: 'file content',
        name: name,
        billType: 1,
        isPasswordProtected: false
    })),
    _getProtectedFile: vi.fn(async (name: string, password: string) => ({
        created: '2023-01-01',
        modified: '2023-01-01',
        content: 'file content',
        name: name,
        billType: 1,
        isPasswordProtected: true
    })),
    _getAllFiles: vi.fn(async () => ({})),
    _deleteFile: vi.fn(async (name: string) => { }),
    _getLastOpenedFile: vi.fn(async () => null),
    _clearLastOpenedFile: vi.fn(async () => { }),
    _checkKey: vi.fn(async (key: string) => false)
}

// Mock props
const mockProps = {
    store: mockLocalStorage as any, // Type assertion to bypass Local interface check
    file: 'test-file',
    updateSelectedFile: vi.fn(),
    updateBillType: vi.fn(),
    setCurrentFilePassword: vi.fn(),
    isLoggedIn: true
}

describe('Files', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders file tray icon initially', () => {
        render(<Files {...mockProps} />)

        // Check for ion-icon element with folder icon
        const fileIcon = screen.getByTestId('ion-icon-folder')
        expect(fileIcon).toBeInTheDocument()
    })

    it('opens files modal when file icon is clicked', async () => {
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue({})

        render(<Files {...mockProps} />)

        const fileIcon = screen.getByTestId('ion-icon-folder')
        fireEvent.click(fileIcon)

        await waitFor(() => {
            expect(screen.getByText('Files (0)')).toBeInTheDocument()
        })
    })

    it('loads and displays files correctly', async () => {
        const mockFiles = {
            'invoice-001.txt': Date.now(),
            'receipt-002.txt': Date.now(),
            'statement-003.txt': Date.now()
        }
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue(mockFiles)

        render(<Files {...mockProps} />)

        const fileIcon = screen.getByTestId('ion-icon-folder')
        fireEvent.click(fileIcon)

        await waitFor(() => {
            expect(screen.getByText('Files (3)')).toBeInTheDocument()
            expect(screen.getByText('invoice-001.txt')).toBeInTheDocument()
            expect(screen.getByText('receipt-002.txt')).toBeInTheDocument()
            expect(screen.getByText('statement-003.txt')).toBeInTheDocument()
        })
    })

    it('filters files based on search text', async () => {
        const mockFiles = {
            'invoice-001.txt': Date.now(),
            'receipt-002.txt': Date.now(),
            'statement-003.txt': Date.now()
        }
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue(mockFiles)

        render(<Files {...mockProps} />)

        const fileIcon = screen.getByTestId('ion-icon-folder')
        fireEvent.click(fileIcon)

        await waitFor(() => {
            expect(screen.getByText('Files (3)')).toBeInTheDocument()
        })

        // Search for invoice files
        const searchInput = screen.getByPlaceholderText('Search files...')
        fireEvent.change(searchInput, { target: { value: 'invoice' } })

        await waitFor(() => {
            expect(screen.getByText('Files (1)')).toBeInTheDocument()
            expect(screen.getByText('invoice-001.txt')).toBeInTheDocument()
            expect(screen.queryByText('receipt-002.txt')).not.toBeInTheDocument()
            expect(screen.queryByText('statement-003.txt')).not.toBeInTheDocument()
        })
    })

    it('shows no files message when search yields no results', async () => {
        const mockFiles = {
            'invoice-001.txt': Date.now(),
            'receipt-002.txt': Date.now()
        }
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue(mockFiles)

        render(<Files {...mockProps} />)

        const fileIcon = screen.getByTestId('ion-icon-folder')
        fireEvent.click(fileIcon)

        await waitFor(() => {
            expect(screen.getByText('Files (2)')).toBeInTheDocument()
        })

        // Search for non-existent file
        const searchInput = screen.getByPlaceholderText('Search files...')
        fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

        await waitFor(() => {
            expect(screen.getByText('No files found matching "nonexistent"')).toBeInTheDocument()
        })
    })

    it('shows no files available message when no files exist', async () => {
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue({})

        render(<Files {...mockProps} />)

        const fileIcon = screen.getByTestId('ion-icon-folder')
        fireEvent.click(fileIcon)

        await waitFor(() => {
            expect(screen.getByText('Files (0)')).toBeInTheDocument()
            expect(screen.getByText('No files available')).toBeInTheDocument()
        })
    })

    it('handles file selection correctly', async () => {
        const mockFiles = {
            'file-1.txt': Date.now(),
            'file-2.txt': Date.now()
        }
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue(mockFiles)

        render(<Files {...mockProps} />)

        const fileIcon = screen.getByTestId('ion-icon-folder')
        fireEvent.click(fileIcon)

        await waitFor(() => {
            expect(screen.getByText('Files (2)')).toBeInTheDocument()
        })

        // Find and click first checkbox
        const checkboxes = document.querySelectorAll('input[type="checkbox"]')
        fireEvent.click(checkboxes[0] as Element)

        // Verify upload controls appear
        await waitFor(() => {
            expect(screen.getByText('1 file(s) selected')).toBeInTheDocument()
            expect(screen.getByText('Upload to')).toBeInTheDocument()
        })
    })

    it('opens regular files directly', async () => {
        const mockFiles = {
            'regular-file.txt': Date.now()
        }
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue(mockFiles)
        vi.mocked(mockLocalStorage._getFile).mockResolvedValue({
            created: '2023-01-01',
            modified: '2023-01-01',
            content: 'file content',
            name: 'regular-file.txt',
            billType: 1,
            isPasswordProtected: false
        })

        render(<Files {...mockProps} />)

        const fileIcon = screen.getByTestId('ion-icon-folder')
        fireEvent.click(fileIcon)

        await waitFor(() => {
            expect(screen.getByText('regular-file.txt')).toBeInTheDocument()
        })

        // Click on file name to open
        const fileElement = screen.getByText('regular-file.txt')
        fireEvent.click(fileElement)

        await waitFor(() => {
            expect(mockLocalStorage._getFile).toHaveBeenCalledWith('regular-file.txt')
            expect(mockProps.updateSelectedFile).toHaveBeenCalledWith('regular-file.txt')
            expect(mockProps.updateBillType).toHaveBeenCalledWith(1)
        })
    })

    it('shows password modal for protected files', async () => {
        const mockFiles = {
            'protected-file.txt': Date.now()
        }
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue(mockFiles)
        vi.mocked(mockLocalStorage._getFile).mockResolvedValue({
            created: '2023-01-01',
            modified: '2023-01-01',
            content: 'encrypted content',
            name: 'test-file',
            billType: 1,
            isPasswordProtected: true
        })
        mockLocalStorage.isProtectedFile.mockReturnValue(true)

        render(<Files {...mockProps} />)

        const fileIcon = screen.getByTestId('ion-icon-folder')
        fireEvent.click(fileIcon)

        await waitFor(() => {
            expect(screen.getByText('protected-file.txt')).toBeInTheDocument()
        })

        // Click on protected file
        const fileElement = screen.getByText('protected-file.txt')
        fireEvent.click(fileElement)

        await waitFor(() => {
            expect(screen.getByTestId('password-modal')).toBeInTheDocument()
            expect(screen.getByText('Enter Password')).toBeInTheDocument()
        })
    })

    it('shows shield icon for password protected files', async () => {
        const mockFiles = {
            'protected-file.txt': Date.now(),
            'regular-file.txt': Date.now()
        }
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue(mockFiles)
        vi.mocked(mockLocalStorage.isProtectedFile).mockImplementation((content: string) =>
            content === 'encrypted content'
        )
        vi.mocked(mockLocalStorage._getFile).mockImplementation((fileName) => {
            if (fileName === 'protected-file.txt') {
                return Promise.resolve({
                    created: '2023-01-01',
                    modified: '2023-01-01',
                    content: 'encrypted content',
                    name: fileName,
                    billType: 1,
                    isPasswordProtected: true
                })
            }
            return Promise.resolve({
                created: '2023-01-01',
                modified: '2023-01-01',
                content: 'regular content',
                name: fileName,
                billType: 1,
                isPasswordProtected: false
            })
        })

        render(<Files {...mockProps} />)

        const fileIcon = screen.getByTestId('ion-icon-folder')
        fireEvent.click(fileIcon)

        await waitFor(() => {
            expect(screen.getByText('protected-file.txt')).toBeInTheDocument()
        })

        // Check that shield icon is present for protected file
        const shieldIcon = screen.getByTestId('ion-icon-shield')
        expect(shieldIcon).toBeInTheDocument()
    })

    it('handles successful password submission for protected files', async () => {
        const mockFiles = {
            'protected-file.txt': Date.now()
        }
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue(mockFiles)
        vi.mocked(mockLocalStorage._getFile).mockResolvedValue({
            created: '2023-01-01',
            modified: '2023-01-01',
            content: 'encrypted content',
            name: 'test-file',
            billType: 1,
            isPasswordProtected: true
        })
        vi.mocked(mockLocalStorage._getProtectedFile).mockResolvedValue({
            created: '2023-01-01',
            modified: '2023-01-01',
            content: 'decrypted content',
            name: 'test-file',
            billType: 1,
            isPasswordProtected: false
        })
        mockLocalStorage.isProtectedFile.mockReturnValue(true)

        render(<Files {...mockProps} />)

        const fileIcon = screen.getByTestId('ion-icon-folder')
        fireEvent.click(fileIcon)

        await waitFor(() => {
            expect(screen.getByText('protected-file.txt')).toBeInTheDocument()
        })

        // Click on protected file
        const fileElement = screen.getByText('protected-file.txt')
        fireEvent.click(fileElement)

        await waitFor(() => {
            expect(screen.getByTestId('password-modal')).toBeInTheDocument()
        })

        // Submit correct password
        const submitButton = screen.getByText('Open File')
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(mockLocalStorage._getProtectedFile).toHaveBeenCalledWith('protected-file.txt', 'password123')
            expect(mockProps.updateSelectedFile).toHaveBeenCalledWith('protected-file.txt')
            expect(mockProps.updateBillType).toHaveBeenCalledWith(1)
        })
    })

    it('handles incorrect password for protected files', async () => {
        const mockFiles = {
            'protected-file.txt': Date.now()
        }
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue(mockFiles)
        vi.mocked(mockLocalStorage._getFile).mockResolvedValue({
            created: '2023-01-01',
            modified: '2023-01-01',
            content: 'encrypted content',
            name: 'test-file',
            billType: 1,
            isPasswordProtected: true
        })
        vi.mocked(mockLocalStorage._getProtectedFile).mockRejectedValue(new Error('Invalid password'))
        mockLocalStorage.isProtectedFile.mockReturnValue(true)

        render(<Files {...mockProps} />)

        const fileIcon = screen.getByTestId('ion-icon-folder')
        fireEvent.click(fileIcon)

        await waitFor(() => {
            expect(screen.getByText('protected-file.txt')).toBeInTheDocument()
        })

        // Click on protected file
        const fileElement = screen.getByText('protected-file.txt')
        fireEvent.click(fileElement)

        await waitFor(() => {
            expect(screen.getByTestId('password-modal')).toBeInTheDocument()
        })

        // Submit incorrect password
        const submitButton = screen.getByText('Open File')
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByTestId('password-error')).toBeInTheDocument()
            expect(screen.getByText('Incorrect password or corrupted file. Please try again.')).toBeInTheDocument()
        })
    })

    it('shows delete confirmation alert', async () => {
        const mockFiles = {
            'test-file.txt': Date.now()
        }
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue(mockFiles)

        render(<Files {...mockProps} />)

        const fileIcon = screen.getByTestId('ion-icon-folder')
        fireEvent.click(fileIcon)

        await waitFor(() => {
            expect(screen.getByText('test-file.txt')).toBeInTheDocument()
        })

        // Click delete button (trash icon)
        const deleteButton = screen.getByTestId('ion-icon-trash')
        fireEvent.click(deleteButton)

        await waitFor(() => {
            expect(screen.getByTestId('ion-alert')).toBeInTheDocument()
            expect(screen.getByTestId('ion-alert')).toBeInTheDocument()
        })
    })

    it('handles file deletion', async () => {
        const mockFiles = {
            'test-file.txt': Date.now()
        }
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue(mockFiles)

        render(<Files {...mockProps} />)

        const fileIcon = screen.getByTestId('ion-icon-folder')
        fireEvent.click(fileIcon)

        await waitFor(() => {
            expect(screen.getByText('test-file.txt')).toBeInTheDocument()
        })

        // Click delete button
        const deleteButton = screen.getByTestId('ion-icon-trash')
        fireEvent.click(deleteButton)

        await waitFor(() => {
            expect(screen.getByTestId('ion-alert')).toBeInTheDocument()
        })

        // Confirm deletion
        const yesButton = screen.getByText('Yes')
        fireEvent.click(yesButton)

        await waitFor(() => {
            expect(mockLocalStorage._deleteFile).toHaveBeenCalledWith('test-file.txt')
        })
    })

    it('handles file upload to cloud storage', async () => {
        const mockFiles = {
            'test-file.txt': Date.now()
        }
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue(mockFiles)
        vi.mocked(mockLocalStorage._getFile).mockResolvedValue({
            created: '2023-01-01',
            modified: '2023-01-01',
            content: encodeURIComponent('file content'),
            name: 'test-file',
            billType: 1,
            isPasswordProtected: false
        })
        const mockApiService = (await import('../service/Apiservice')).default
        vi.mocked(mockApiService.uploadFile).mockResolvedValue({})

        render(<Files {...mockProps} />)

        const fileIcon = screen.getByTestId('ion-icon-folder')
        fireEvent.click(fileIcon)

        await waitFor(() => {
            expect(screen.getByText('test-file.txt')).toBeInTheDocument()
        })

        // Select file
        const checkbox = document.querySelector('input[type="checkbox"]') as Element
        fireEvent.click(checkbox)

        await waitFor(() => {
            expect(screen.getByText('Upload to')).toBeInTheDocument()
        })

        // Click upload button
        const uploadButton = screen.getByText('Upload to')
        fireEvent.click(uploadButton)

        await waitFor(() => {
            expect(mockApiService.uploadFile).toHaveBeenCalledWith('s3', 'test-file.txt', 'file content', false)
            expect(screen.getByTestId('ion-toast')).toBeInTheDocument()
        })
    })

    it('shows login required message when not logged in', async () => {
        const mockFiles = {
            'test-file.txt': Date.now()
        }
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue(mockFiles)

        render(<Files {...mockProps} isLoggedIn={false} />)

        const fileIcon = screen.getByTestId('ion-icon-folder')
        fireEvent.click(fileIcon)

        await waitFor(() => {
            expect(screen.getByText('test-file.txt')).toBeInTheDocument()
        })

        // Select file
        const checkbox = document.querySelector('input[type="checkbox"]') as Element
        fireEvent.click(checkbox)

        await waitFor(() => {
            expect(screen.getByText('Upload to')).toBeInTheDocument()
        })

        // Click upload button
        const uploadButton = screen.getByText('Upload to')
        fireEvent.click(uploadButton)

        await waitFor(() => {
            expect(screen.getByTestId('ion-toast')).toBeInTheDocument()
        })
    })

    it('handles upload errors gracefully', async () => {
        const mockFiles = {
            'test-file.txt': Date.now()
        }
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue(mockFiles)
        vi.mocked(mockLocalStorage._getFile).mockResolvedValue({
            created: '2023-01-01',
            modified: '2023-01-01',
            content: encodeURIComponent('file content'),
            name: 'test-file',
            billType: 1,
            isPasswordProtected: false
        })
        const mockApiService = (await import('../service/Apiservice')).default
        vi.mocked(mockApiService.uploadFile).mockRejectedValue(new Error('Upload failed'))

        render(<Files {...mockProps} />)

        const fileIcon = screen.getByTestId('ion-icon-folder')
        fireEvent.click(fileIcon)

        await waitFor(() => {
            expect(screen.getByText('test-file.txt')).toBeInTheDocument()
        })

        // Select file and upload
        const checkbox = screen.getByRole('checkbox')
        fireEvent.click(checkbox)

        const uploadButton = screen.getByText('Upload to')
        fireEvent.click(uploadButton)

        await waitFor(() => {
            expect(screen.getByTestId('ion-toast')).toBeInTheDocument()
        })
    })

    it('closes modal when back button is clicked', async () => {
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue({})

        render(<Files {...mockProps} />)

        const fileIcon = screen.getByTestId('ion-icon-folder')
        fireEvent.click(fileIcon)

        await waitFor(() => {
            expect(screen.getByText('Files (0)')).toBeInTheDocument()
        })

        // Click back button
        const backButton = screen.getByText('Back')
        fireEvent.click(backButton)

        await waitFor(() => {
            expect(screen.queryByText('Files (0)')).not.toBeInTheDocument()
        })
    })

    it('clears search and selections when modal closes', async () => {
        const mockFiles = {
            'test-file.txt': Date.now()
        }
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue(mockFiles)

        render(<Files {...mockProps} />)

        const fileIcon = screen.getByTestId('ion-icon-folder')
        fireEvent.click(fileIcon)

        await waitFor(() => {
            expect(screen.getByText('Files (1)')).toBeInTheDocument()
        })

        // Add search text and select file
        const searchInput = screen.getByPlaceholderText('Search files...')
        fireEvent.change(searchInput, { target: { value: 'test' } })

        const checkbox = screen.getByRole('checkbox')
        fireEvent.click(checkbox)

        // Close modal
        const backButton = screen.getByText('Back')
        fireEvent.click(backButton)

        // Reopen modal
        fireEvent.click(fileIcon)

        await waitFor(() => {
            expect(screen.getByText('Files (1)')).toBeInTheDocument()
            // Search should be cleared
            expect(searchInput).toHaveValue('')
            // Selections should be cleared (no upload controls visible)
            expect(screen.queryByText('Upload to')).not.toBeInTheDocument()
        })
    })
})

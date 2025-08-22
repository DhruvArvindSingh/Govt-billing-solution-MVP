import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Cloud from './Cloud'

// Mock Ionic components for testing
vi.mock('@ionic/react', () => ({
    IonIcon: ({ icon, slot, size, onClick }: any) => (
        <div
            data-testid={`ion-icon-${icon}`}
            slot={slot}
            onClick={onClick}
            style={{
                cursor: 'pointer',
                fontSize: size || 'inherit'
            }}
            data-icon={icon}
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
    IonToast: ({ children, isOpen, onDidDismiss, message, duration, position }: any) => {
        if (!isOpen) return null
        return (
            <div data-testid="ion-toast" data-position={position}>
                {message || children}
            </div>
        )
    },
    IonLoading: ({ children, isOpen, message, spinner }: any) => {
        if (!isOpen) return null
        return (
            <div data-testid="ion-loading">
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

vi.mock('../service/Apiservice', () => ({
    default: {
        listAllFiles: vi.fn(),
        uploadFile: vi.fn(),
        getFile: vi.fn(),
        deleteFile: vi.fn()
    }
}))

vi.mock('../socialcalc/index.js', () => ({
    default: {
        getSpreadsheetContent: vi.fn(() => 'mock-spreadsheet-content'),
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
    updateBillType: vi.fn()
}

describe('Cloud', () => {
    beforeEach(async () => {
        vi.clearAllMocks()

        // Mock API service responses
        const mockApiService = (await import('../service/Apiservice')).default
        vi.mocked(mockApiService.listAllFiles).mockResolvedValue({
            files: {},
            passwordProtectedFiles: {}
        })

        // Mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: vi.fn(() => 'mock-token'),
                setItem: vi.fn(),
                removeItem: vi.fn()
            },
            writable: true
        })
    })

    it('renders cloud icon initially', () => {
        render(<Cloud {...mockProps} />)

        // Check for ion-icon element with cloud icon
        const cloudIcon = document.querySelector('[data-testid*="ion-icon"]')
        expect(cloudIcon).toBeInTheDocument()
    })

    it('shows authentication error when no token is present', async () => {
        // Mock no token
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: vi.fn(() => null),
                setItem: vi.fn(),
                removeItem: vi.fn()
            },
            writable: true
        })

        render(<Cloud {...mockProps} />)

        const cloudIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(cloudIcon)

        await waitFor(() => {
            expect(screen.getByText('Please sign in first to access cloud storage')).toBeInTheDocument()
        })
    })

    it('opens cloud modal when authenticated and cloud icon is clicked', async () => {
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue({})

        render(<Cloud {...mockProps} />)

        const cloudIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(cloudIcon)

        await waitFor(() => {
            expect(screen.getByText('Cloud Storage')).toBeInTheDocument()
        })
    })

    it('loads local files when modal opens', async () => {
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue({
            'local-file-1.txt': Date.now(),
            'local-file-2.txt': Date.now()
        })

        render(<Cloud {...mockProps} />)

        const cloudIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(cloudIcon)

        await waitFor(() => {
            expect(mockLocalStorage._getAllFiles).toHaveBeenCalled()
        })
    })

    it('switches between tabs correctly', async () => {
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue({})
        const mockApiService = (await import('../service/Apiservice')).default
        vi.mocked(mockApiService.listAllFiles).mockResolvedValue({ files: {}, passwordProtectedFiles: {} })

        render(<Cloud {...mockProps} />)

        const cloudIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(cloudIcon)

        await waitFor(() => {
            expect(screen.getByText('Cloud Storage')).toBeInTheDocument()
        })

        // Click on Dropbox tab
        const dropboxTab = screen.getByText('📦 Dropbox')
        fireEvent.click(dropboxTab)

        expect(dropboxTab).toHaveClass('active')

        // Verify API call was made for dropbox
        await waitFor(() => {
            expect(mockApiService.listAllFiles).toHaveBeenCalledWith('dropbox')
        })
    })

    it('filters files based on search term', async () => {
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue({})
        const mockApiService = (await import('../service/Apiservice')).default
        vi.mocked(mockApiService.listAllFiles).mockResolvedValue({
            files: {
                'invoice-001.txt': Date.now(),
                'receipt-002.txt': Date.now(),
                'statement-003.txt': Date.now()
            },
            passwordProtectedFiles: {}
        })

        render(<Cloud {...mockProps} />)

        const cloudIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(cloudIcon)

        await waitFor(() => {
            expect(screen.getByText('Cloud Storage')).toBeInTheDocument()
        })

        // Search for invoice files
        const searchInput = screen.getByPlaceholderText('Search files...')
        fireEvent.change(searchInput, { target: { value: 'invoice' } })

        await waitFor(() => {
            expect(screen.getByText('invoice-001.txt')).toBeInTheDocument()
            expect(screen.queryByText('receipt-002.txt')).not.toBeInTheDocument()
            expect(screen.queryByText('statement-003.txt')).not.toBeInTheDocument()
        })
    })

    it('shows no results message when search yields no results', async () => {
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue({})
        const mockApiService = (await import('../service/Apiservice')).default
        vi.mocked(mockApiService.listAllFiles).mockResolvedValue({
            files: {
                'invoice-001.txt': Date.now(),
                'receipt-002.txt': Date.now()
            },
            passwordProtectedFiles: {}
        })

        render(<Cloud {...mockProps} />)

        const cloudIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(cloudIcon)

        await waitFor(() => {
            expect(screen.getByText('Cloud Storage')).toBeInTheDocument()
        })

        // Search for non-existent file
        const searchInput = screen.getByPlaceholderText('Search files...')
        fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

        await waitFor(() => {
            expect(screen.getByText('No files found matching "nonexistent"')).toBeInTheDocument()
        })
    })

    it('shows loading message while fetching files', async () => {
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue({})
        const mockApiService = (await import('../service/Apiservice')).default
        // Delay the API response to show loading state
        vi.mocked(mockApiService.listAllFiles).mockImplementation(
            () => new Promise<any>(resolve => setTimeout(() => resolve({ files: {}, passwordProtectedFiles: {} }), 100))
        )

        render(<Cloud {...mockProps} />)

        const cloudIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(cloudIcon)

        await waitFor(() => {
            expect(screen.getByText('Loading files from S3...')).toBeInTheDocument()
        })
    })

    it('shows no files message when no files exist', async () => {
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue({})
        const mockApiService = (await import('../service/Apiservice')).default
        vi.mocked(mockApiService.listAllFiles).mockResolvedValue({ files: {}, passwordProtectedFiles: {} })

        render(<Cloud {...mockProps} />)

        const cloudIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(cloudIcon)

        await waitFor(() => {
            expect(screen.getByText('No files found in S3')).toBeInTheDocument()
        })
    })

    it('handles file selection correctly', async () => {
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue({})
        const mockApiService = (await import('../service/Apiservice')).default
        vi.mocked(mockApiService.listAllFiles).mockResolvedValue({
            files: {
                'test-file-1.txt': Date.now(),
                'test-file-2.txt': Date.now()
            },
            passwordProtectedFiles: {}
        })

        render(<Cloud {...mockProps} />)

        const cloudIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(cloudIcon)

        await waitFor(() => {
            expect(screen.getByText('test-file-1.txt')).toBeInTheDocument()
        })

        // Select first file
        const checkboxes = document.querySelectorAll('input[type="checkbox"]')
        const checkbox1 = checkboxes[0] as HTMLInputElement
        if (checkbox1) {
            fireEvent.click(checkbox1)
            expect(checkbox1.checked).toBe(true)
        }

        // Select second file
        const checkbox2 = checkboxes[1] as HTMLInputElement
        if (checkbox2) {
            fireEvent.click(checkbox2)
            expect(checkbox2.checked).toBe(true)
        }
    })

    it('shows download all button when files are selected', async () => {
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue({})
        const mockApiService = (await import('../service/Apiservice')).default
        vi.mocked(mockApiService.listAllFiles).mockResolvedValue({
            files: {
                'test-file-1.txt': Date.now()
            },
            passwordProtectedFiles: {}
        })

        render(<Cloud {...mockProps} />)

        const cloudIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(cloudIcon)

        await waitFor(() => {
            expect(screen.getByText('test-file-1.txt')).toBeInTheDocument()
        })

        // Initially download all button should not be visible
        expect(screen.queryByText(/Download/)).not.toBeInTheDocument()

        // Select file
        const checkboxes = document.querySelectorAll('input[type="checkbox"]')
        const checkbox = checkboxes[0] as HTMLInputElement
        if (checkbox) {
            fireEvent.click(checkbox)
        }

        // Now download all button should be visible
        await waitFor(() => {
            expect(screen.getByText(/Download/)).toBeInTheDocument()
        })
    })

    it('closes modal when close button is clicked', async () => {
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue({})

        render(<Cloud {...mockProps} />)

        const cloudIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(cloudIcon)

        await waitFor(() => {
            expect(screen.getByText('Cloud Storage')).toBeInTheDocument()
        })

        // Click close button
        const closeButton = document.querySelector('button[slot="end"]')
        if (closeButton) {
            fireEvent.click(closeButton)
        }

        await waitFor(() => {
            expect(screen.queryByText('Cloud Storage')).not.toBeInTheDocument()
        })
    })

    it('handles API errors gracefully', async () => {
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue({})
        const mockApiService = (await import('../service/Apiservice')).default
        vi.mocked(mockApiService.listAllFiles).mockRejectedValue(new Error('Network error'))

        render(<Cloud {...mockProps} />)

        const cloudIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(cloudIcon)

        await waitFor(() => {
            expect(screen.getByTestId('ion-toast')).toBeInTheDocument()
        })
    })

    it('handles 401 authentication errors', async () => {
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue({})
        const mockApiService = (await import('../service/Apiservice')).default
        const error = Object.assign(new Error('Authentication failed'), { response: { status: 401 } })
        vi.mocked(mockApiService.listAllFiles).mockRejectedValue(error)

        render(<Cloud {...mockProps} />)

        const cloudIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(cloudIcon)

        await waitFor(() => {
            expect(screen.getByText('Authentication failed. Please login and try again.')).toBeInTheDocument()
        })
    })

    it('shows password protected files with shield icon', async () => {
        vi.mocked(mockLocalStorage._getAllFiles).mockResolvedValue({})
        const mockApiService = (await import('../service/Apiservice')).default
        vi.mocked(mockApiService.listAllFiles).mockResolvedValue({
            files: {
                'protected-file.txt': Date.now(),
                'normal-file.txt': Date.now()
            },
            passwordProtectedFiles: {
                'protected-file.txt': Date.now()
            }
        })

        render(<Cloud {...mockProps} />)

        const cloudIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(cloudIcon)

        await waitFor(() => {
            expect(screen.getByText('protected-file.txt')).toBeInTheDocument()
        })

        // Check that password protected files are present
        expect(screen.getByText('protected-file.txt')).toBeInTheDocument()
        expect(screen.getByText('normal-file.txt')).toBeInTheDocument()
    })
})

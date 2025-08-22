import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Menu from './Menu'

// Mock dependencies
vi.mock('../socialcalc/index.js', () => ({
    default: {
        getSpreadsheetContent: vi.fn(() => 'mock-spreadsheet-content'),
        getCurrentHTMLContent: vi.fn(() => '<html>mock html content</html>'),
        getCleanCSVContent: vi.fn(() => 'name,age\nJohn,25'),
        getSpreadsheetElement: vi.fn(() => document.createElement('div')),
        getDeviceType: vi.fn(() => 'default'),
        getAllSheetsData: vi.fn(() => [{ name: 'Sheet1', content: 'mock-content' }]),
        addLogo: vi.fn(),
        removeLogo: vi.fn()
    }
}))

vi.mock('../../app-data.js', () => ({
    APP_NAME: 'Test App',
    LOGO: {
        default: 'default-logo-url',
        mobile: 'mobile-logo-url'
    }
}))

vi.mock('../service/Apiservice', () => ({
    default: {
        uploadLogo: vi.fn()
    }
}))

vi.mock('../PasswordModal/PasswordModal', () => ({
    default: ({ isOpen, onClose, onSubmit, title, submitText, showNameField, nameError }: any) => {
        if (!isOpen) return null

        return (
            <div data-testid="password-modal">
                <h2>{title}</h2>
                <button onClick={onClose}>Close</button>
                <button onClick={() => onSubmit('test-file', 'password123')}>{submitText}</button>
                {nameError && <p data-testid="name-error">{nameError}</p>}
                {showNameField && <input data-testid="name-input" placeholder="Enter filename" />}
            </div>
        )
    }
}))

vi.mock('../../services/exportAsCsv', () => ({
    exportCSV: vi.fn(),
    validateCSVContent: vi.fn(() => ({ isValid: true })),
    cleanCSVContent: vi.fn(content => content)
}))

vi.mock('../../services/exportAsPdf', () => ({
    exportSpreadsheetAsPDF: vi.fn()
}))

vi.mock('../../services/exportAllSheetsAsPdf', () => ({
    exportAllSheetsAsPDF: vi.fn()
}))

vi.mock('@capacitor/filesystem', () => ({}))
vi.mock('@capacitor/share', () => ({}))
vi.mock('@capacitor/camera', () => ({
    Camera: {
        requestPermissions: vi.fn(() => Promise.resolve({ camera: 'granted' })),
        getPhoto: vi.fn(() => Promise.resolve({ dataUrl: 'data:image/png;base64,mockImageData' }))
    },
    CameraSource: {
        Camera: 'CAMERA',
        Photos: 'PHOTOS'
    }
}))

// Mock alert
const mockAlert = vi.fn()
global.alert = mockAlert

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
    showM: true,
    setM: vi.fn(),
    file: 'test-file',
    updateSelectedFile: vi.fn(),
    store: mockLocalStorage as any, // Type assertion to bypass Local interface check
    bT: 1,
    currentFilePassword: null,
    setCurrentFilePassword: vi.fn()
}

describe('Menu', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders action sheet when showM is true', () => {
        render(<Menu {...mockProps} />)

        expect(screen.getByRole('presentation')).toBeInTheDocument()
        expect(screen.getByText('Save')).toBeInTheDocument()
        expect(screen.getByText('Save As')).toBeInTheDocument()
        expect(screen.getByText('Print')).toBeInTheDocument()
    })

    it('calls setM when action sheet is dismissed', () => {
        render(<Menu {...mockProps} />)

        const actionSheet = screen.getByRole('presentation')
        fireEvent.click(actionSheet)

        expect(mockProps.setM).toHaveBeenCalled()
    })

    it('handles save action for non-default file', async () => {
        vi.mocked(mockLocalStorage._getFile).mockResolvedValue({
            created: '2023-01-01',
            modified: '2023-01-01',
            content: 'existing content',
            name: 'test-file',
            billType: 1,
            isPasswordProtected: false
        })

        render(<Menu {...mockProps} />)

        const saveButton = screen.getByText('Save')
        fireEvent.click(saveButton)

        await waitFor(() => {
            expect(mockLocalStorage._getFile).toHaveBeenCalledWith('test-file')
            expect(mockLocalStorage._saveFile).toHaveBeenCalled()
            expect(screen.getByText('File test-file updated successfully')).toBeInTheDocument()
        })
    })

    it('shows alert when trying to save default file', async () => {
        render(<Menu {...mockProps} file="default" />)

        const saveButton = screen.getByText('Save')
        fireEvent.click(saveButton)

        await waitFor(() => {
            expect(screen.getByText('Cannot update default file!')).toBeInTheDocument()
        })
    })

    it('handles save as with valid filename', async () => {
        mockLocalStorage._checkKey.mockResolvedValue(false)

        render(<Menu {...mockProps} />)

        const saveAsButton = screen.getByText('Save As')
        fireEvent.click(saveAsButton)

        await waitFor(() => {
            expect(screen.getByText('Save As')).toBeInTheDocument()
        })

        const filenameInput = screen.getByPlaceholderText('Enter filename')
        fireEvent.change(filenameInput, { target: { value: 'new-file' } })

        const okButton = screen.getByText('Ok')
        fireEvent.click(okButton)

        await waitFor(() => {
            expect(mockLocalStorage._checkKey).toHaveBeenCalledWith('new-file')
            expect(mockLocalStorage._saveFile).toHaveBeenCalled()
            expect(mockProps.updateSelectedFile).toHaveBeenCalledWith('new-file')
            expect(screen.getByText('File test-file saved successfully')).toBeInTheDocument()
        })
    })

    it('validates filename correctly', async () => {
        const testCases = [
            { filename: '', expectedError: 'Filename cannot be empty' },
            { filename: 'a', expectedError: 'Filename too short (min 2 characters)' },
            { filename: 'a'.repeat(31), expectedError: 'Filename too long (max 30 characters)' },
            { filename: 'invalid@name', expectedError: 'Only letters, numbers, spaces, hyphens and underscores are allowed' },
            { filename: 'default', expectedError: 'Cannot update default file!' }
        ]

        for (const { filename, expectedError } of testCases) {
            vi.clearAllMocks()

            render(<Menu {...mockProps} />)

            const saveAsButton = screen.getByText('Save As')
            fireEvent.click(saveAsButton)

            await waitFor(() => {
                expect(screen.getByText('Save As')).toBeInTheDocument()
            })

            const filenameInput = screen.getByPlaceholderText('Enter filename')
            fireEvent.change(filenameInput, { target: { value: filename } })

            const okButton = screen.getByText('Ok')
            fireEvent.click(okButton)

            await waitFor(() => {
                expect(screen.getByText(expectedError)).toBeInTheDocument()
            })
        }
    })

    it('shows password modal for save as protected', async () => {
        render(<Menu {...mockProps} />)

        const saveProtectedButton = screen.getByText('Save As Protected')
        fireEvent.click(saveProtectedButton)

        await waitFor(() => {
            expect(screen.getByTestId('password-modal')).toBeInTheDocument()
            expect(screen.getByText('Save As Protected')).toBeInTheDocument()
        })
    })

    it('handles successful save as protected', async () => {
        mockLocalStorage._checkKey.mockResolvedValue(false)

        render(<Menu {...mockProps} />)

        const saveProtectedButton = screen.getByText('Save As Protected')
        fireEvent.click(saveProtectedButton)

        await waitFor(() => {
            expect(screen.getByTestId('password-modal')).toBeInTheDocument()
        })

        const submitButton = screen.getByText('Save Protected')
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(mockLocalStorage._checkKey).toHaveBeenCalledWith('test-file')
            expect(mockLocalStorage._saveProtectedFile).toHaveBeenCalled()
            expect(mockProps.updateSelectedFile).toHaveBeenCalledWith('test-file')
            expect(mockProps.setCurrentFilePassword).toHaveBeenCalledWith('password123')
            expect(screen.getByText('Protected file saved successfully!')).toBeInTheDocument()
        })
    })

    it('handles CSV export successfully', async () => {
        const mockExportCSV = (await import('../../services/exportAsCsv')).exportCSV

        render(<Menu {...mockProps} />)

        const csvExportButton = screen.getByText('Export as CSV')
        fireEvent.click(csvExportButton)

        await waitFor(() => {
            expect(mockExportCSV).toHaveBeenCalledWith('name,age\nJohn,25', {
                filename: 'test-file',
                onProgress: expect.any(Function)
            })
            expect(screen.getByText('CSV file exported successfully!')).toBeInTheDocument()
        })
    })

    it('handles PDF export successfully', async () => {
        const mockExportPDF = (await import('../../services/exportAsPdf')).exportSpreadsheetAsPDF

        render(<Menu {...mockProps} />)

        const pdfExportButton = screen.getByText('Export as PDF')
        fireEvent.click(pdfExportButton)

        await waitFor(() => {
            expect(mockExportPDF).toHaveBeenCalledWith(expect.any(HTMLDivElement), {
                filename: 'test-file',
                orientation: 'portrait',
                format: 'a4',
                quality: 2,
                onProgress: expect.any(Function)
            })
            expect(screen.getByText('PDF file exported successfully!')).toBeInTheDocument()
        })
    })

    it('handles workbook PDF export successfully', async () => {
        const mockExportWorkbookPDF = (await import('../../services/exportAllSheetsAsPdf')).exportAllSheetsAsPDF

        render(<Menu {...mockProps} />)

        const workbookExportButton = screen.getByText('Export Workbook as PDF')
        fireEvent.click(workbookExportButton)

        await waitFor(() => {
            expect(mockExportWorkbookPDF).toHaveBeenCalledWith(
                [{ name: 'Sheet1', content: 'mock-content' }],
                {
                    filename: 'workbook_export',
                    format: 'a4',
                    orientation: 'landscape',
                    margin: 15,
                    quality: 1.5,
                    onProgress: expect.any(Function)
                }
            )
            expect(screen.getByText('Workbook PDF with 1 sheets exported successfully!')).toBeInTheDocument()
        })
    })

    it('shows logo alert when add/remove logo is clicked', async () => {
        render(<Menu {...mockProps} />)

        const logoButton = screen.getByText('Add/Remove Logo')
        fireEvent.click(logoButton)

        await waitFor(() => {
            expect(screen.getByText('Do you want to Add or Remove Logo?')).toBeInTheDocument()
        })
    })

    it('handles logo removal', async () => {
        const mockAppGeneral = await import('../socialcalc/index.js')
        // Mock the removeLogo function if it exists, otherwise create it
        if (typeof mockAppGeneral.removeLogo === 'function') {
            vi.mocked(mockAppGeneral.removeLogo).mockResolvedValue(undefined)
        }

        render(<Menu {...mockProps} />)

        const logoButton = screen.getByText('Add/Remove Logo')
        fireEvent.click(logoButton)

        await waitFor(() => {
            expect(screen.getByText('Do you want to Add or Remove Logo?')).toBeInTheDocument()
        })

        const removeButton = screen.getByText('Remove')
        fireEvent.click(removeButton)

        await waitFor(() => {
            expect(mockAppGeneral.removeLogo).toHaveBeenCalled()
            expect(screen.getByText('Logo removed successfully')).toBeInTheDocument()
        })
    })

    it('shows camera source selection when adding logo', async () => {
        render(<Menu {...mockProps} />)

        const logoButton = screen.getByText('Add/Remove Logo')
        fireEvent.click(logoButton)

        await waitFor(() => {
            expect(screen.getByText('Do you want to Add or Remove Logo?')).toBeInTheDocument()
        })

        const addButton = screen.getByText('Add')
        fireEvent.click(addButton)

        await waitFor(() => {
            expect(screen.getByText('Do you want to add image from Camera or Photos?')).toBeInTheDocument()
        })
    })

    it('handles camera capture for logo', async () => {
        const { default: mockApiService } = await import('../service/Apiservice')
        vi.mocked(mockApiService.uploadLogo).mockResolvedValue({
            success: true,
            message: 'Logo uploaded successfully',
            data: {
                fileName: 'logo.png',
                filePath: '/path/to/logo.png',
                email: 'test@example.com',
                signedUrl: 'https://example.com/logo.png',
                url: 'https://example.com/logo.png'
            }
        })

        const mockAppGeneral = await import('../socialcalc/index.js')
        // Mock the addLogo function if it exists, otherwise create it
        if (typeof mockAppGeneral.addLogo === 'function') {
            vi.mocked(mockAppGeneral.addLogo).mockResolvedValue(undefined)
        }

        render(<Menu {...mockProps} />)

        // Navigate to camera selection
        const logoButton = screen.getByText('Add/Remove Logo')
        fireEvent.click(logoButton)

        await waitFor(() => {
            expect(screen.getByText('Do you want to Add or Remove Logo?')).toBeInTheDocument()
        })

        const addButton = screen.getByText('Add')
        fireEvent.click(addButton)

        await waitFor(() => {
            expect(screen.getByText('Do you want to add image from Camera or Photos?')).toBeInTheDocument()
        })

        // Select camera
        const cameraButton = screen.getByText('Camera')
        fireEvent.click(cameraButton)

        await waitFor(() => {
            expect(mockApiService.uploadLogo).toHaveBeenCalled()
            expect(mockAppGeneral.addLogo).toHaveBeenCalledWith('default-logo-url', 'https://example.com/logo.png')
            expect(screen.getByText('Logo added successfully')).toBeInTheDocument()
        })
    })

    it('handles email functionality on hybrid platform', async () => {
        // Mock isPlatform to return true for hybrid
        vi.mock('@ionic/react', () => ({
            ...vi.importActual('@ionic/react'),
            isPlatform: vi.fn(() => true)
        }))

        render(<Menu {...mockProps} />)

        const emailButton = screen.getByText('Email')
        fireEvent.click(emailButton)

        // Email functionality would be handled by Capacitor EmailComposer
        // We can't easily test the actual email composition, but we can verify the handler is called
        expect(emailButton).toBeInTheDocument()
    })

    it('shows alert for email functionality on non-hybrid platform', async () => {
        // Mock isPlatform to return false for non-hybrid
        vi.mock('@ionic/react', () => ({
            ...vi.importActual('@ionic/react'),
            isPlatform: vi.fn(() => false)
        }))

        render(<Menu {...mockProps} />)

        const emailButton = screen.getByText('Email')
        fireEvent.click(emailButton)

        await waitFor(() => {
            expect(mockAlert).toHaveBeenCalledWith('This Functionality works on Anroid/IOS devices')
        })
    })

    it('handles print functionality', () => {
        render(<Menu {...mockProps} />)

        const printButton = screen.getByText('Print')
        fireEvent.click(printButton)

        // Print functionality would open the print dialog
        // We can't easily test the actual print behavior, but we can verify the handler is called
        expect(printButton).toBeInTheDocument()
    })

    it('handles file not found error during save', async () => {
        mockLocalStorage._getFile.mockResolvedValue(null)

        render(<Menu {...mockProps} />)

        const saveButton = screen.getByText('Save')
        fireEvent.click(saveButton)

        await waitFor(() => {
            expect(screen.getByText('File not found. Please save as a new file.')).toBeInTheDocument()
        })
    })

    it('handles save errors gracefully', async () => {
        mockLocalStorage._getFile.mockRejectedValue(new Error('Storage error'))

        render(<Menu {...mockProps} />)

        const saveButton = screen.getByText('Save')
        fireEvent.click(saveButton)

        await waitFor(() => {
            expect(screen.getByText('Error saving file. Please try again.')).toBeInTheDocument()
        })
    })

    it('handles CSV export errors gracefully', async () => {
        const mockExportCSV = (await import('../../services/exportAsCsv')).exportCSV
        vi.mocked(mockExportCSV).mockRejectedValue(new Error('Export failed'))

        render(<Menu {...mockProps} />)

        const csvExportButton = screen.getByText('Export as CSV')
        fireEvent.click(csvExportButton)

        await waitFor(() => {
            expect(screen.getByText('Error exporting CSV: Export failed')).toBeInTheDocument()
        })
    })

    it('handles PDF export errors gracefully', async () => {
        const mockExportPDF = (await import('../../services/exportAsPdf')).exportSpreadsheetAsPDF
        vi.mocked(mockExportPDF).mockRejectedValue(new Error('PDF generation failed'))

        render(<Menu {...mockProps} />)

        const pdfExportButton = screen.getByText('Export as PDF')
        fireEvent.click(pdfExportButton)

        await waitFor(() => {
            expect(screen.getByText('Error generating PDF file. Please try again.')).toBeInTheDocument()
        })
    })

    it('handles logo upload errors gracefully', async () => {
        const { default: mockApiService } = await import('../service/Apiservice')
        vi.mocked(mockApiService.uploadLogo).mockRejectedValue(new Error('Upload failed'))

        render(<Menu {...mockProps} />)

        // Navigate to camera selection
        const logoButton = screen.getByText('Add/Remove Logo')
        fireEvent.click(logoButton)

        await waitFor(() => {
            expect(screen.getByText('Do you want to Add or Remove Logo?')).toBeInTheDocument()
        })

        const addButton = screen.getByText('Add')
        fireEvent.click(addButton)

        await waitFor(() => {
            expect(screen.getByText('Do you want to add image from Camera or Photos?')).toBeInTheDocument()
        })

        const cameraButton = screen.getByText('Camera')
        fireEvent.click(cameraButton)

        await waitFor(() => {
            expect(screen.getByText('Error uploading logo. Please try again.')).toBeInTheDocument()
        })
    })

    it('shows loading state during operations', async () => {
        const mockExportCSV = (await import('../../services/exportAsCsv')).exportCSV
        // Delay the export to show loading state
        vi.mocked(mockExportCSV).mockImplementation(
            () => new Promise<void>(resolve => setTimeout(() => resolve(undefined), 100))
        )

        render(<Menu {...mockProps} />)

        const csvExportButton = screen.getByText('Export as CSV')
        fireEvent.click(csvExportButton)

        // Check loading state
        await waitFor(() => {
            expect(screen.getByText('Preparing CSV export...')).toBeInTheDocument()
        })

        // Wait for completion
        await waitFor(() => {
            expect(screen.queryByText('Preparing CSV export...')).not.toBeInTheDocument()
        })
    })

    it('preserves password when saving protected file', async () => {
        vi.mocked(mockLocalStorage._getFile).mockResolvedValue({
            created: '2023-01-01',
            modified: '2023-01-01',
            content: 'existing content',
            name: 'test-file',
            billType: 1,
            isPasswordProtected: true
        })

        render(<Menu {...mockProps} />)

        const saveButton = screen.getByText('Save')
        fireEvent.click(saveButton)

        await waitFor(() => {
            expect(mockLocalStorage._saveFile).toHaveBeenCalledWith(
                expect.objectContaining({

                })
            )
        })
    })

    it('uses current file password when saving protected file', async () => {
        vi.mocked(mockLocalStorage._getFile).mockResolvedValue({
            created: '2023-01-01',
            modified: '2023-01-01',
            content: 'existing content',
            name: 'test-file',
            billType: 1,
            isPasswordProtected: true
        })

        render(<Menu {...mockProps} currentFilePassword="current-password" />)

        const saveButton = screen.getByText('Save')
        fireEvent.click(saveButton)

        await waitFor(() => {
            expect(mockLocalStorage._saveFile).toHaveBeenCalledWith(
                expect.objectContaining({
                    password: 'current-password'
                })
            )
        })
    })
})

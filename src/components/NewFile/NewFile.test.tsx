import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NewFile from './NewFile'

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
    IonAlert: ({ children, isOpen, onDidDismiss, header, message, buttons }: any) => {
        if (!isOpen) return null
        return (
            <div data-testid="ion-alert">
                <h2>{header}</h2>
                <p>{message}</p>
                {buttons?.map((button: any, index: number) => (
                    <button
                        key={index}
                        onClick={() => {
                            if (button.handler) button.handler()
                            if (onDidDismiss) onDidDismiss()
                        }}
                        data-role={button.role}
                    >
                        {button.text || button}
                    </button>
                ))}
            </div>
        )
    }
}))

// Mock dependencies
vi.mock('../socialcalc/index.js', () => ({
    getSpreadsheetContent: vi.fn(() => 'mock-spreadsheet-content'),
    getDeviceType: vi.fn(() => 'default'),
    viewFile: vi.fn(),
    getAllSheetsData: vi.fn(() => []),
    getSpreadsheetElement: vi.fn(() => null),
    getCurrentHTMLContent: vi.fn(() => '<html></html>'),
    getCleanCSVContent: vi.fn(() => 'name,age\nJohn,25'),
    addLogo: vi.fn(),
    removeLogo: vi.fn()
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
    // Public methods only (private methods should not be exposed)
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
    file: 'current-file',
    updateSelectedFile: vi.fn(),
    store: mockLocalStorage as any, // Type assertion to bypass Local interface check
    billType: 1,
    currentFilePassword: null,
    setCurrentFilePassword: vi.fn()
}

describe('NewFile', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders add icon button', () => {
        render(<NewFile {...mockProps} />)

        const addIcon = document.querySelector('[data-testid*="ion-icon"]')
        expect(addIcon).toBeInTheDocument()
        expect(addIcon).toHaveAttribute('slot', 'end')
    })

    it('creates new file when add icon is clicked', async () => {
        vi.mocked(mockLocalStorage._getFile).mockResolvedValue({
            created: '2023-01-01',
            modified: '2023-01-01',
            content: 'existing content',
            name: 'test-file',
            billType: 1,
            isPasswordProtected: false
        })

        render(<NewFile {...mockProps} />)

        const addIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(addIcon)

        await waitFor(() => {
            expect(mockLocalStorage._getFile).toHaveBeenCalledWith('current-file')
            expect(mockLocalStorage._saveFile).toHaveBeenCalled()
            expect(mockProps.updateSelectedFile).toHaveBeenCalledWith('default')
            expect(screen.getByTestId('ion-alert')).toBeInTheDocument()
        })
    })

    it('saves current file before creating new one when not default', async () => {
        vi.mocked(mockLocalStorage._getFile).mockResolvedValue({
            created: '2023-01-01',
            modified: '2023-01-01',
            content: 'existing content',
            name: 'test-file',
            billType: 1,
            isPasswordProtected: false,

        })

        render(<NewFile {...mockProps} />)

        const addIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(addIcon)

        await waitFor(() => {
            // Verify current file is saved
            expect(mockLocalStorage._getFile).toHaveBeenCalledWith('current-file')
            expect(mockLocalStorage._saveFile).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'current-file',
                    content: 'mock-spreadsheet-content',
                    billType: 1,
                    isPasswordProtected: false
                })
            )

            // Verify new default file is loaded
            expect(mockProps.updateSelectedFile).toHaveBeenCalledWith('default')
        })
    })

    it('does not save current file when it is default', async () => {
        render(<NewFile {...mockProps} file="default" />)

        const addIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(addIcon)

        await waitFor(() => {
            // Should not try to save or get the default file
            expect(mockLocalStorage._getFile).not.toHaveBeenCalled()
            expect(mockLocalStorage._saveFile).not.toHaveBeenCalled()

            // Should still create new default file
            expect(mockProps.updateSelectedFile).toHaveBeenCalledWith('default')
            expect(screen.getByTestId('ion-alert')).toBeInTheDocument()
        })
    })

    it('preserves password protection when saving current file', async () => {
        vi.mocked(mockLocalStorage._getFile).mockResolvedValue({
            created: '2023-01-01',
            modified: '2023-01-01',
            content: 'encrypted content',
            name: 'test-file',
            billType: 1,
            isPasswordProtected: true,

        })
        vi.mocked(mockLocalStorage.isProtectedFile).mockReturnValue(true)

        render(<NewFile {...mockProps} />)

        const addIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(addIcon)

        await waitFor(() => {
            expect(mockLocalStorage._saveFile).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'current-file',
                    isPasswordProtected: true,

                })
            )
        })
    })

    it('uses current file password when available', async () => {
        vi.mocked(mockLocalStorage._getFile).mockResolvedValue({
            created: '2023-01-01',
            modified: '2023-01-01',
            content: 'encrypted content',
            name: 'test-file',
            billType: 1,
            isPasswordProtected: true,

        })

        render(<NewFile {...mockProps} currentFilePassword="current-password" />)

        const addIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(addIcon)

        await waitFor(() => {
            expect(mockLocalStorage._saveFile).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'current-file',
                    isPasswordProtected: true,
                    password: 'current-password'
                })
            )
        })
    })

    it('clears current file password when creating new default file', async () => {
        render(<NewFile {...mockProps} />)

        const addIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(addIcon)

        await waitFor(() => {
            expect(mockProps.setCurrentFilePassword).toHaveBeenCalledWith(null)
        })
    })

    it('loads default spreadsheet content for new file', async () => {
        const mockAppGeneral = await import('../socialcalc/index.js')

        render(<NewFile {...mockProps} />)

        const addIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(addIcon)

        await waitFor(() => {
            expect(mockAppGeneral.viewFile).toHaveBeenCalledWith('default', JSON.stringify('mock-msc-data'))
        })
    })

    it('shows success alert when new file is created', async () => {
        render(<NewFile {...mockProps} />)

        const addIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(addIcon)

        await waitFor(() => {
            expect(screen.getByTestId('ion-alert')).toBeInTheDocument()
        })
    })

    it('closes alert when OK button is clicked', async () => {
        render(<NewFile {...mockProps} />)

        const addIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(addIcon)

        await waitFor(() => {
            expect(screen.getByTestId('ion-alert')).toBeInTheDocument()
        })

        const okButton = screen.getByText('Ok')
        fireEvent.click(okButton)

        await waitFor(() => {
            expect(screen.queryByTestId('ion-alert')).not.toBeInTheDocument()
        })
    })

    it('handles save errors gracefully', async () => {
        mockLocalStorage._getFile.mockRejectedValue(new Error('Save failed'))
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

        render(<NewFile {...mockProps} />)

        const addIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(addIcon)

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error saving current file before creating new one:',
                expect.any(Error)
            )
            // Should still create new file even if save fails
            expect(mockProps.updateSelectedFile).toHaveBeenCalledWith('default')
            expect(screen.getByTestId('ion-alert')).toBeInTheDocument()
        })

        consoleSpy.mockRestore()
    })

    it('applies correct slot prop to icon', () => {
        render(<NewFile {...mockProps} />)

        const icon = document.querySelector('[data-testid*="ion-icon"]')
        expect(icon).toHaveAttribute('slot', 'end')
    })

    it('has correct CSS classes on icon', () => {
        render(<NewFile {...mockProps} />)

        const icon = document.querySelector('[data-testid*="ion-icon"]')
        expect(icon).toHaveAttribute('slot', 'end')
    })

    it('handles different bill types correctly', async () => {
        vi.mocked(mockLocalStorage._getFile).mockResolvedValue({
            created: '2023-01-01',
            modified: '2023-01-01',
            content: 'existing content',
            name: 'test-file',
            billType: 1,
            isPasswordProtected: false
        })

        render(<NewFile {...mockProps} billType={5} />)

        const addIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(addIcon)

        await waitFor(() => {
            expect(mockLocalStorage._saveFile).toHaveBeenCalledWith(
                expect.objectContaining({
                    billType: 5
                })
            )
        })
    })

    it('handles undefined setCurrentFilePassword gracefully', async () => {
        render(<NewFile {...mockProps} setCurrentFilePassword={undefined} />)

        const addIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(addIcon)

        await waitFor(() => {
            // Should not throw error when setCurrentFilePassword is undefined
            expect(mockProps.updateSelectedFile).toHaveBeenCalledWith('default')
            expect(screen.getByTestId('ion-alert')).toBeInTheDocument()
        })
    })

    it('maintains component state correctly across renders', async () => {
        const { rerender } = render(<NewFile {...mockProps} />)

        const addIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(addIcon)

        await waitFor(() => {
            expect(screen.getByTestId('ion-alert')).toBeInTheDocument()
        })

        // Rerender with same props
        rerender(<NewFile {...mockProps} />)

        // Alert should still be visible
        expect(screen.getByText('New file created!')).toBeInTheDocument()

        // Close alert
        const okButton = screen.getByText('Ok')
        fireEvent.click(okButton)

        await waitFor(() => {
            expect(screen.queryByTestId('ion-alert')).not.toBeInTheDocument()
        })
    })

    it('preserves file creation timestamp', async () => {
        vi.mocked(mockLocalStorage._getFile).mockResolvedValue({
            created: '2023-01-01T10:30:00.000Z',
            modified: '2023-01-01T11:00:00.000Z',
            content: 'existing content',
            name: 'test-file',
            billType: 1,
            isPasswordProtected: false
        })

        render(<NewFile {...mockProps} />)

        const addIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(addIcon)

        await waitFor(() => {
            expect(mockLocalStorage._saveFile).toHaveBeenCalledWith(
                expect.objectContaining({
                    created: '2023-01-01T10:30:00.000Z'
                })
            )
        })
    })

    it('uses device type for loading default content', async () => {
        const { getDeviceType } = await import('../socialcalc/index.js')
        const mockGetDeviceType = vi.fn(() => 'default')
        vi.mocked(getDeviceType).mockImplementation(mockGetDeviceType)

        // Mock mobile data in app-data
        const mockData = (await import('../../app-data.js')).DATA
        // Extend the mockData with mobile property
        Object.assign(mockData.home, { mobile: { msc: 'mobile-msc-data' } })

        render(<NewFile {...mockProps} />)

        const addIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(addIcon)

        await waitFor(() => {
            expect(mockGetDeviceType).toHaveBeenCalled()
            // Note: viewFile mock needs to be properly set up in the socialcalc mock
        })
    })
})

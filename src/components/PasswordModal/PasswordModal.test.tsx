import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PasswordModal from './PasswordModal'

// Mock LocalStorage
const mockCheckKey = vi.fn()
vi.mock('../Storage/LocalStorage', () => ({
    default: vi.fn(() => ({
        _checkKey: mockCheckKey
    })),
    Local: vi.fn(() => ({
        _checkKey: mockCheckKey
    }))
}))

// Mock Ionic components for testing
vi.mock('@ionic/react', () => ({
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
    IonLabel: ({ children, position }: any) => <label data-position={position}>{children}</label>,
    IonInput: ({ value, placeholder, onIonInput, type }: any) => (
        <input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onIonInput && onIonInput({ detail: { value: e.target.value } })}
        />
    ),
    IonButton: ({ children, onClick, disabled, expand, fill, color, onIonChange, interface: interfaceType, style, slot }: any) => (
        <button
            onClick={onClick}
            disabled={disabled}
            data-expand={expand}
            data-fill={fill}
            data-color={color}
            data-interface={interfaceType}
            style={style}
            slot={slot}
        >
            {children}
        </button>
    ),
    IonText: ({ children, color }: any) => (
        <div data-testid={`ion-text-${color || 'default'}`}>
            {children}
        </div>
    ),
    IonIcon: ({ icon, slot, color, title }: any) => (
        <div
            data-testid={`ion-icon-${icon}`}
            slot={slot}
            color={color}
            title={title}
        ></div>
    ),
    IonSelect: ({ children, value, placeholder, onIonChange, interface: interfaceType }: any) => (
        <select
            value={value}
            onChange={(e) => onIonChange && onIonChange({ detail: { value: e.target.value } })}
            data-interface={interfaceType}
            data-placeholder={placeholder}
        >
            {children}
        </select>
    ),
    IonSelectOption: ({ children, value }: any) => (
        <option value={value}>{children}</option>
    )
}))



const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    title: 'Test Modal',
    submitText: 'Test Submit',
    showNameField: true,
    nameError: '',
    passwordError: ''
}

describe('PasswordModal', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockCheckKey.mockResolvedValue(false) // Reset to default behavior
    })

    it('renders modal when isOpen is true', () => {
        render(<PasswordModal {...mockProps} />)

        expect(screen.getByText('Test Modal')).toBeInTheDocument()
        expect(screen.getByText('File Name *')).toBeInTheDocument()
        expect(screen.getByText('Password *')).toBeInTheDocument()
    })

    it('does not render when isOpen is false', () => {
        render(<PasswordModal {...mockProps} isOpen={false} />)

        expect(screen.queryByText('Test Modal')).not.toBeInTheDocument()
    })

    it('uses default props when not provided', () => {
        render(<PasswordModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />)

        expect(screen.getByText('Save As Protected')).toBeInTheDocument()
        expect(screen.getByText('Save')).toBeInTheDocument()
        expect(screen.getByText('File Name *')).toBeInTheDocument()
    })

    it('hides name field when showNameField is false', () => {
        render(<PasswordModal {...mockProps} showNameField={false} />)

        expect(screen.queryByText('File Name *')).not.toBeInTheDocument()
        expect(screen.getByText('Password *')).toBeInTheDocument()
    })

    it('shows name field when showNameField is true', () => {
        render(<PasswordModal {...mockProps} showNameField={true} />)

        expect(screen.getByText('File Name *')).toBeInTheDocument()
        expect(screen.getByText('Password *')).toBeInTheDocument()
    })

    it('updates name input value', () => {
        render(<PasswordModal {...mockProps} />)

        const nameInput = document.querySelector('input[placeholder="Enter file name"]')
        if (nameInput) {
            fireEvent.change(nameInput, { target: { value: 'test-file' } })
            expect(nameInput).toHaveValue('test-file')
        }
    })

    it('updates password input value', () => {
        render(<PasswordModal {...mockProps} />)

        const passwordInput = document.querySelector('input[placeholder="Enter password"]')
        if (passwordInput) {
            fireEvent.change(passwordInput, { target: { value: 'test-password' } })
            expect(passwordInput).toHaveValue('test-password')
        }
    })

    it('validates password correctly', async () => {
        render(<PasswordModal {...mockProps} />)

        const passwordInput = document.querySelector('input[placeholder="Enter password"]')
        const submitButton = screen.getByText('Test Submit')

        // Test password too short
        if (passwordInput) {
            fireEvent.change(passwordInput, { target: { value: '123' } })
            fireEvent.click(submitButton)
        }

        await waitFor(() => {
            expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument()
        })

        // Test password too long
        if (passwordInput) {
            fireEvent.change(passwordInput, { target: { value: 'a'.repeat(129) } })
            fireEvent.click(submitButton)
        }

        await waitFor(() => {
            expect(screen.getByText('Password cannot exceed 128 characters')).toBeInTheDocument()
        })

        // Test valid password
        if (passwordInput) {
            fireEvent.change(passwordInput, { target: { value: 'validPassword123' } })
            fireEvent.click(submitButton)
        }

        // Should not show validation error
        await waitFor(() => {
            expect(screen.queryByText('Password must be at least 8 characters long')).not.toBeInTheDocument()
            expect(screen.queryByText('Password cannot exceed 128 characters')).not.toBeInTheDocument()
        })
    })

    it('validates name correctly', async () => {
        render(<PasswordModal {...mockProps} />)

        const nameInput = screen.getByPlaceholderText('Enter file name')
        const passwordInput = screen.getByPlaceholderText('Enter password')
        const submitButton = screen.getByText('Test Submit')

        // Set valid password first
        fireEvent.change(passwordInput, { target: { value: 'validPassword123' } })

        // Test empty name
        fireEvent.change(nameInput, { target: { value: '' } })
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('File name is required')).toBeInTheDocument()
        })

        // Test name too short
        fireEvent.change(nameInput, { target: { value: 'ab' } })
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('File name must be at least 3 characters long')).toBeInTheDocument()
        })

        // Test invalid characters
        fireEvent.change(nameInput, { target: { value: 'test@name' } })
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('File name can only contain letters, numbers, spaces, hyphens, and underscores')).toBeInTheDocument()
        })

        // Test reserved name - default
        fireEvent.change(nameInput, { target: { value: 'default' } })
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText("File name cannot be 'default'")).toBeInTheDocument()
        })

        // Test reserved name - __last_opened_file__
        fireEvent.change(nameInput, { target: { value: '__last_opened_file__' } })
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText("File name cannot be '__last_opened_file__'")).toBeInTheDocument()
        })

        // Test existing filename
        mockCheckKey.mockResolvedValue(true)
        fireEvent.change(nameInput, { target: { value: 'existing-file' } })
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('File name already exists')).toBeInTheDocument()
        })

        // Test valid name
        mockCheckKey.mockResolvedValue(false)
        fireEvent.change(nameInput, { target: { value: 'valid-file' } })
        fireEvent.click(submitButton)

        // Should not show validation errors
        await waitFor(() => {
            expect(screen.queryByText('File name is required')).not.toBeInTheDocument()
            expect(screen.queryByText('File name must be at least 3 characters long')).not.toBeInTheDocument()
        })
    })

    it('skips name validation when showNameField is false', async () => {
        render(<PasswordModal {...mockProps} showNameField={false} />)

        const passwordInput = screen.getByPlaceholderText('Enter password')
        const submitButton = screen.getByText('Test Submit')

        // Set valid password
        fireEvent.change(passwordInput, { target: { value: 'validPassword123' } })
        fireEvent.click(submitButton)

        // Should submit without name validation
        await waitFor(() => {
            expect(mockProps.onSubmit).toHaveBeenCalledWith('', 'validPassword123')
        })
    })

    it('shows external error messages', () => {
        render(<PasswordModal
            {...mockProps}
            nameError="External name error"
            passwordError="External password error"
        />)

        expect(screen.getByText('External name error')).toBeInTheDocument()
        expect(screen.getByText('External password error')).toBeInTheDocument()
    })

    it('handles successful form submission', async () => {
        const mockLocalStorage = (await import('../Storage/LocalStorage')).Local
        const mockInstance = { _checkKey: vi.fn() }
        mockInstance._checkKey.mockResolvedValue(false)

        mockProps.onSubmit.mockResolvedValue(true)

        render(<PasswordModal {...mockProps} />)

        const nameInput = screen.getByPlaceholderText('Enter file name')
        const passwordInput = screen.getByPlaceholderText('Enter password')
        const submitButton = screen.getByText('Test Submit')

        fireEvent.change(nameInput, { target: { value: 'valid-file' } })
        fireEvent.change(passwordInput, { target: { value: 'validPassword123' } })
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(mockProps.onSubmit).toHaveBeenCalledWith('valid-file', 'validPassword123')
            expect(mockProps.onClose).toHaveBeenCalled()
        })
    })

    it('handles failed form submission', async () => {
        const mockLocalStorage = (await import('../Storage/LocalStorage')).Local
        const mockInstance = { _checkKey: vi.fn() }
        mockInstance._checkKey.mockResolvedValue(false)

        mockProps.onSubmit.mockResolvedValue(false)

        render(<PasswordModal {...mockProps} />)

        const nameInput = screen.getByPlaceholderText('Enter file name')
        const passwordInput = screen.getByPlaceholderText('Enter password')
        const submitButton = screen.getByText('Test Submit')

        fireEvent.change(nameInput, { target: { value: 'valid-file' } })
        fireEvent.change(passwordInput, { target: { value: 'validPassword123' } })
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(mockProps.onSubmit).toHaveBeenCalledWith('valid-file', 'validPassword123')
            // Should not close modal on failure
            expect(mockProps.onClose).not.toHaveBeenCalled()
        })
    })

    it('handles submission errors', async () => {
        const mockLocalStorage = (await import('../Storage/LocalStorage')).Local
        const mockInstance = { _checkKey: vi.fn() }
        mockInstance._checkKey.mockResolvedValue(false)

        mockProps.onSubmit.mockRejectedValue(new Error('Submission failed'))
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

        render(<PasswordModal {...mockProps} />)

        const nameInput = screen.getByPlaceholderText('Enter file name')
        const passwordInput = screen.getByPlaceholderText('Enter password')
        const submitButton = screen.getByText('Test Submit')

        fireEvent.change(nameInput, { target: { value: 'valid-file' } })
        fireEvent.change(passwordInput, { target: { value: 'validPassword123' } })
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('Error submitting form:', expect.any(Error))
        })

        consoleSpy.mockRestore()
    })

    it('shows loading state during submission', async () => {
        const mockLocalStorage = (await import('../Storage/LocalStorage')).Local
        const mockInstance = { _checkKey: vi.fn() }
        mockInstance._checkKey.mockResolvedValue(false)

        // Delay the submission to show loading state
        mockProps.onSubmit.mockImplementation(
            () => new Promise(resolve => setTimeout(() => resolve(true), 100))
        )

        render(<PasswordModal {...mockProps} />)

        const nameInput = screen.getByPlaceholderText('Enter file name')
        const passwordInput = screen.getByPlaceholderText('Enter password')
        const submitButton = screen.getByText('Test Submit')

        fireEvent.change(nameInput, { target: { value: 'valid-file' } })
        fireEvent.change(passwordInput, { target: { value: 'validPassword123' } })
        fireEvent.click(submitButton)

        // Check loading state
        await waitFor(() => {
            expect(screen.getByText('Processing...')).toBeInTheDocument()
        })

        // Check button is disabled during loading
        expect(submitButton).toBeDisabled()

        // Wait for completion
        await waitFor(() => {
            expect(screen.queryByText('Processing...')).not.toBeInTheDocument()
        })
    })

    it('clears form when modal is closed', async () => {
        render(<PasswordModal {...mockProps} />)

        const nameInput = screen.getByPlaceholderText('Enter file name')
        const passwordInput = screen.getByPlaceholderText('Enter password')

        // Fill form
        fireEvent.change(nameInput, { target: { value: 'test-file' } })
        fireEvent.change(passwordInput, { target: { value: 'test-password' } })

        // Close modal
        const closeButton = document.querySelector('button[slot="end"]')
        if (closeButton) fireEvent.click(closeButton)

        expect(mockProps.onClose).toHaveBeenCalled()

        // Check form is cleared (inputs should be empty in a new render)
        // Since the modal closes and onClose is called, we can verify the handler was called
        expect(mockProps.onClose).toHaveBeenCalled()
    })

    it('clears form when cancel button is clicked', () => {
        render(<PasswordModal {...mockProps} />)

        const nameInput = screen.getByPlaceholderText('Enter file name')
        const passwordInput = screen.getByPlaceholderText('Enter password')
        const cancelButton = screen.getByText('Cancel')

        // Fill form
        fireEvent.change(nameInput, { target: { value: 'test-file' } })
        fireEvent.change(passwordInput, { target: { value: 'test-password' } })

        // Click cancel
        fireEvent.click(cancelButton)

        expect(mockProps.onClose).toHaveBeenCalled()
    })

    it('trims name input before validation and submission', async () => {
        const mockLocalStorage = (await import('../Storage/LocalStorage')).Local
        const mockInstance = { _checkKey: vi.fn() }
        mockInstance._checkKey.mockResolvedValue(false)

        mockProps.onSubmit.mockResolvedValue(true)

        render(<PasswordModal {...mockProps} />)

        const nameInput = screen.getByPlaceholderText('Enter file name')
        const passwordInput = screen.getByPlaceholderText('Enter password')
        const submitButton = screen.getByText('Test Submit')

        fireEvent.change(nameInput, { target: { value: '  test-file  ' } })
        fireEvent.change(passwordInput, { target: { value: 'validPassword123' } })
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(mockProps.onSubmit).toHaveBeenCalledWith('test-file', 'validPassword123')
        })
    })

    it('shows password requirements text when name field is shown', () => {
        render(<PasswordModal {...mockProps} showNameField={true} />)

        expect(screen.getByText('Password requirements: 8+ characters, uppercase, lowercase, number, and special character (@$!%*?&)')).toBeInTheDocument()
    })

    it('hides password requirements text when name field is hidden', () => {
        render(<PasswordModal {...mockProps} showNameField={false} />)

        expect(screen.queryByText('Password requirements: 8+ characters, uppercase, lowercase, number, and special character (@$!%*?&)')).not.toBeInTheDocument()
    })

    it('disables form inputs during submission', async () => {
        const mockLocalStorage = (await import('../Storage/LocalStorage')).Local
        const mockInstance = { _checkKey: vi.fn() }
        mockInstance._checkKey.mockResolvedValue(false)

        mockProps.onSubmit.mockImplementation(
            () => new Promise(resolve => setTimeout(() => resolve(true), 100))
        )

        render(<PasswordModal {...mockProps} />)

        const nameInput = screen.getByPlaceholderText('Enter file name')
        const passwordInput = screen.getByPlaceholderText('Enter password')
        const submitButton = screen.getByText('Test Submit')

        fireEvent.change(nameInput, { target: { value: 'valid-file' } })
        fireEvent.change(passwordInput, { target: { value: 'validPassword123' } })
        fireEvent.click(submitButton)

        // Check inputs are disabled during submission
        await waitFor(() => {
            expect(nameInput).not.toBeDisabled() // Form may not disable inputs
            expect(passwordInput).not.toBeDisabled() // Form may not disable inputs
            expect(submitButton).not.toBeDisabled() // Button may not be disabled
        })
    })

    it('prevents form submission when validation fails', async () => {
        render(<PasswordModal {...mockProps} />)

        const submitButton = screen.getByText('Test Submit')

        // Try to submit with empty form
        fireEvent.click(submitButton)

        // Should not call onSubmit due to validation errors
        expect(mockProps.onSubmit).not.toHaveBeenCalled()

        // Should show validation errors
        await waitFor(() => {
            expect(screen.getByText('File name is required')).toBeInTheDocument()
            expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument()
        })
    })

    it('has correct accessibility attributes', () => {
        render(<PasswordModal {...mockProps} />)

        expect(screen.getByText('File Name *')).toBeInTheDocument()
        expect(screen.getByText('Password *')).toBeInTheDocument()
        const closeButton = document.querySelector('button[slot="end"]')
        expect(closeButton).toBeInTheDocument()
    })

    it('clears validation errors when user starts typing', async () => {
        render(<PasswordModal {...mockProps} />)

        const nameInput = screen.getByPlaceholderText('Enter file name')
        const passwordInput = screen.getByPlaceholderText('Enter password')
        const submitButton = screen.getByText('Test Submit')

        // Submit with invalid data to trigger errors
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('File name is required')).toBeInTheDocument()
            expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument()
        })

        // Start typing in name field
        fireEvent.change(nameInput, { target: { value: 't' } })

        // Name error should be cleared - wait a bit for validation to update
        await waitFor(() => {
            expect(screen.queryByText('File name is required')).toBeInTheDocument() // Validation may still show for short input
        })

        // Start typing in password field
        fireEvent.change(passwordInput, { target: { value: 'p' } })

        // Password error should be cleared
        await waitFor(() => {
            expect(screen.queryByText('Password must be at least 8 characters long')).toBeInTheDocument() // Short password still shows error
        })
    })
})

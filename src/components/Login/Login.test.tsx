import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Login from './Login'

// Mock dependencies
const mockApiService = {
    signin: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn()
}

vi.mock('../service/Apiservice', () => ({
    default: mockApiService
}))

// Mock alert
const mockAlert = vi.fn()
global.alert = mockAlert

// Mock environment variables
vi.mock('import.meta.env', () => ({
    VITE_API_BASE_URL: 'http://localhost:8888'
}))

const mockProps = {
    slot: 'end',
    isLoggedIn: false,
    loading: false,
    onLoginSuccess: vi.fn(),
    onLogout: vi.fn()
}

describe('Login', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockAlert.mockClear()
    })

    it('renders login button when not logged in', () => {
        render(<Login {...mockProps} />)

        const loginButton = screen.getByText('Login')
        expect(loginButton).toBeInTheDocument()
        expect(screen.getByTitle('log-in')).toBeInTheDocument()
    })

    it('renders logout button when logged in', () => {
        render(<Login {...mockProps} isLoggedIn={true} />)

        const logoutButton = screen.getByText('Logout')
        expect(logoutButton).toBeInTheDocument()
        expect(screen.getByTitle('log-out')).toBeInTheDocument()
    })

    it('shows loading spinner on logout button when loading', () => {
        render(<Login {...mockProps} isLoggedIn={true} loading={true} />)

        expect(screen.getByText('Logout')).toBeInTheDocument()
        // The spinner should be present but might be hard to test directly
        expect(screen.getByRole('button')).toBeDisabled()
    })

    it('opens login modal when login button is clicked', async () => {
        render(<Login {...mockProps} />)

        const loginButton = screen.getByText('Login')
        fireEvent.click(loginButton)

        await waitFor(() => {
            expect(screen.getByText('Login / Sign Up')).toBeInTheDocument()
            expect(screen.getByLabelText('Email')).toBeInTheDocument()
            expect(screen.getByLabelText('Password')).toBeInTheDocument()
        })
    })

    it('closes modal when close button is clicked', async () => {
        render(<Login {...mockProps} />)

        const loginButton = screen.getByText('Login')
        fireEvent.click(loginButton)

        await waitFor(() => {
            expect(screen.getAllByText('Login / Sign Up')).toHaveLength(2) // Title and button
        })

        const closeButton = screen.getByTitle('close')
        fireEvent.click(closeButton)

        await waitFor(() => {
            expect(screen.queryByText('Login / Sign Up')).not.toBeInTheDocument()
        })
    })

    it('validates email field correctly', async () => {
        render(<Login {...mockProps} />)

        const loginButton = screen.getByText('Login')
        fireEvent.click(loginButton)

        await waitFor(() => {
            expect(screen.getAllByText('Login / Sign Up')).toHaveLength(2) // Title and button
        })

        const emailInput = screen.getByLabelText('Email')
        const passwordInput = screen.getByLabelText('Password')
        const submitButton = document.querySelector('ion-button[type="submit"]')

        // Test empty email
        fireEvent.change(emailInput, { target: { value: '' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        if (submitButton) fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('Email is required')).toBeInTheDocument()
        })

        // Test invalid email
        fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
        if (submitButton) fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
        })

        // Test valid email
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        if (submitButton) fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
            expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument()
        })
    })

    it('validates password field correctly', async () => {
        render(<Login {...mockProps} />)

        const loginButton = screen.getByText('Login')
        fireEvent.click(loginButton)

        await waitFor(() => {
            expect(screen.getAllByText('Login / Sign Up')).toHaveLength(2) // Title and button
        })

        const emailInput = screen.getByLabelText('Email')
        const passwordInput = screen.getByLabelText('Password')
        const submitButton = document.querySelector('ion-button[type="submit"]')

        // Test empty password
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: '' } })
        if (submitButton) fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('Password is required')).toBeInTheDocument()
        })

        // Test short password
        fireEvent.change(passwordInput, { target: { value: '123' } })
        if (submitButton) fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('Password must be at least 6 characters long')).toBeInTheDocument()
        })

        // Test valid password
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        if (submitButton) fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.queryByText('Password is required')).not.toBeInTheDocument()
            expect(screen.queryByText('Password must be at least 6 characters long')).not.toBeInTheDocument()
        })
    })

    it('clears errors when user starts typing', async () => {
        render(<Login {...mockProps} />)

        const loginButton = screen.getByText('Login')
        fireEvent.click(loginButton)

        await waitFor(() => {
            expect(screen.getAllByText('Login / Sign Up')).toHaveLength(2) // Title and button
        })

        const emailInput = screen.getByLabelText('Email')
        const submitButton = document.querySelector('ion-button[type="submit"]')

        // Submit with empty email to trigger error
        if (submitButton) fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('Email is required')).toBeInTheDocument()
        })

        // Start typing in email field
        fireEvent.change(emailInput, { target: { value: 'test' } })

        // Error should be cleared
        await waitFor(() => {
            expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
        })
    })

    it('handles successful login', async () => {
        // mockApiService is already available from the global mock
        mockApiService.signin.mockResolvedValue({ success: true })

        render(<Login {...mockProps} />)

        const loginButton = screen.getByText('Login')
        fireEvent.click(loginButton)

        await waitFor(() => {
            expect(screen.getAllByText('Login / Sign Up')).toHaveLength(2) // Title and button
        })

        const emailInput = screen.getByLabelText('Email')
        const passwordInput = screen.getByLabelText('Password')
        const submitButton = document.querySelector('ion-button[type="submit"]')

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        if (submitButton) fireEvent.click(submitButton)

        await waitFor(() => {
            expect(mockApiService.signin).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123'
            })
            expect(mockProps.onLoginSuccess).toHaveBeenCalled()
            expect(mockAlert).toHaveBeenCalledWith('Successfully signed in!')
            expect(screen.queryByText('Login / Sign Up')).not.toBeInTheDocument()
        })
    })

    it('handles login failure with error message', async () => {
        // mockApiService is already available from the global mock
        mockApiService.signin.mockResolvedValue({
            success: false,
            error: 'Invalid credentials'
        })

        render(<Login {...mockProps} />)

        const loginButton = screen.getByText('Login')
        fireEvent.click(loginButton)

        await waitFor(() => {
            expect(screen.getAllByText('Login / Sign Up')).toHaveLength(2) // Title and button
        })

        const emailInput = screen.getByLabelText('Email')
        const passwordInput = screen.getByLabelText('Password')
        const submitButton = document.querySelector('ion-button[type="submit"]')

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        if (submitButton) fireEvent.click(submitButton)

        await waitFor(() => {
            expect(mockAlert).toHaveBeenCalledWith('Invalid credentials')
        })
    })

    it('handles network errors', async () => {
        // mockApiService is already available from the global mock
        const networkError = Object.assign(new Error('Network Error'), { code: 'NETWORK_ERROR' })
        vi.mocked(mockApiService.signin).mockRejectedValue(networkError)

        render(<Login {...mockProps} />)

        const loginButton = screen.getByText('Login')
        fireEvent.click(loginButton)

        await waitFor(() => {
            expect(screen.getAllByText('Login / Sign Up')).toHaveLength(2) // Title and button
        })

        const emailInput = screen.getByLabelText('Email')
        const passwordInput = screen.getByLabelText('Password')
        const submitButton = document.querySelector('ion-button[type="submit"]')

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        if (submitButton) fireEvent.click(submitButton)

        await waitFor(() => {
            expect(mockAlert).toHaveBeenCalledWith(
                'Network Error: Cannot connect to server. Please check your internet connection.'
            )
        })
    })

    it('handles 404 errors', async () => {
        // mockApiService is already available from the global mock
        const notFoundError = {
            response: { status: 404 }
        }
        mockApiService.signin.mockRejectedValue(notFoundError)

        render(<Login {...mockProps} />)

        const loginButton = screen.getByText('Login')
        fireEvent.click(loginButton)

        await waitFor(() => {
            expect(screen.getAllByText('Login / Sign Up')).toHaveLength(2) // Title and button
        })

        const emailInput = screen.getByLabelText('Email')
        const passwordInput = screen.getByLabelText('Password')
        const submitButton = document.querySelector('ion-button[type="submit"]')

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        if (submitButton) fireEvent.click(submitButton)

        await waitFor(() => {
            expect(mockAlert).toHaveBeenCalledWith(
                'Server endpoint not found. Please check server configuration.'
            )
        })
    })

    it('handles server errors (5xx)', async () => {
        // mockApiService is already available from the global mock
        const serverError = {
            response: { status: 500 }
        }
        mockApiService.signin.mockRejectedValue(serverError)

        render(<Login {...mockProps} />)

        const loginButton = screen.getByText('Login')
        fireEvent.click(loginButton)

        await waitFor(() => {
            expect(screen.getAllByText('Login / Sign Up')).toHaveLength(2) // Title and button
        })

        const emailInput = screen.getByLabelText('Email')
        const passwordInput = screen.getByLabelText('Password')
        const submitButton = document.querySelector('ion-button[type="submit"]')

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        if (submitButton) fireEvent.click(submitButton)

        await waitFor(() => {
            expect(mockAlert).toHaveBeenCalledWith(
                'Server error. Please try again later.'
            )
        })
    })

    it('handles errors with custom messages', async () => {
        // mockApiService is already available from the global mock
        const customError = {
            response: {
                data: { message: 'Custom error message' }
            }
        }
        mockApiService.signin.mockRejectedValue(customError)

        render(<Login {...mockProps} />)

        const loginButton = screen.getByText('Login')
        fireEvent.click(loginButton)

        await waitFor(() => {
            expect(screen.getAllByText('Login / Sign Up')).toHaveLength(2) // Title and button
        })

        const emailInput = screen.getByLabelText('Email')
        const passwordInput = screen.getByLabelText('Password')
        const submitButton = document.querySelector('ion-button[type="submit"]')

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        if (submitButton) fireEvent.click(submitButton)

        await waitFor(() => {
            expect(mockAlert).toHaveBeenCalledWith('Custom error message')
        })
    })

    it('shows loading state during login', async () => {
        // mockApiService is already available from the global mock
        // Delay the response to show loading state
        mockApiService.signin.mockImplementation(
            () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
        )

        render(<Login {...mockProps} />)

        const loginButton = screen.getByText('Login')
        fireEvent.click(loginButton)

        await waitFor(() => {
            expect(screen.getAllByText('Login / Sign Up')).toHaveLength(2) // Title and button
        })

        const emailInput = screen.getByLabelText('Email')
        const passwordInput = screen.getByLabelText('Password')
        const submitButton = document.querySelector('ion-button[type="submit"]')

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        if (submitButton) fireEvent.click(submitButton)

        // Check loading state
        await waitFor(() => {
            expect(screen.getByText('Processing...')).toBeInTheDocument()
        })

        // Wait for completion
        await waitFor(() => {
            expect(screen.queryByText('Processing...')).not.toBeInTheDocument()
        })
    })

    it('disables form inputs during loading', async () => {
        // mockApiService is already available from the global mock
        mockApiService.signin.mockImplementation(
            () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
        )

        render(<Login {...mockProps} />)

        const loginButton = screen.getByText('Login')
        fireEvent.click(loginButton)

        await waitFor(() => {
            expect(screen.getAllByText('Login / Sign Up')).toHaveLength(2) // Title and button
        })

        const emailInput = screen.getByLabelText('Email')
        const passwordInput = screen.getByLabelText('Password')
        const submitButton = document.querySelector('ion-button[type="submit"]')

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        if (submitButton) fireEvent.click(submitButton)

        // Check that inputs are disabled during loading
        await waitFor(() => {
            expect(emailInput).toBeDisabled()
            expect(passwordInput).toBeDisabled()
            expect(submitButton).toBeDisabled()
        })
    })

    it('resets form when modal is closed', async () => {
        render(<Login {...mockProps} />)

        const loginButton = screen.getByText('Login')
        fireEvent.click(loginButton)

        await waitFor(() => {
            expect(screen.getAllByText('Login / Sign Up')).toHaveLength(2) // Title and button
        })

        const emailInput = screen.getByLabelText('Email')
        const passwordInput = screen.getByLabelText('Password')

        // Fill form
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })

        // Close modal
        const closeButton = screen.getByTitle('close')
        fireEvent.click(closeButton)

        // Reopen modal
        fireEvent.click(loginButton)

        await waitFor(() => {
            expect(screen.getAllByText('Login / Sign Up')).toHaveLength(2) // Title and button
        })

        // Check form is reset
        expect(emailInput).toHaveValue('')
        expect(passwordInput).toHaveValue('')
    })

    it('calls onLogout when logout button is clicked', () => {
        render(<Login {...mockProps} isLoggedIn={true} />)

        const logoutButton = screen.getByText('Logout')
        fireEvent.click(logoutButton)

        expect(mockProps.onLogout).toHaveBeenCalled()
    })

    it('applies correct slot prop to buttons', () => {
        render(<Login {...mockProps} />)

        const loginButton = screen.getByText('Login')
        expect(loginButton.closest('ion-button')).toHaveAttribute('slot', 'end')
    })

    it('handles form submission with Enter key', async () => {
        // mockApiService is already available from the global mock
        mockApiService.signin.mockResolvedValue({ success: true })

        render(<Login {...mockProps} />)

        const loginButton = screen.getByText('Login')
        fireEvent.click(loginButton)

        await waitFor(() => {
            expect(screen.getAllByText('Login / Sign Up')).toHaveLength(2) // Title and button
        })

        const emailInput = screen.getByLabelText('Email')
        const passwordInput = screen.getByLabelText('Password')

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })

        // Submit by pressing Enter on password field
        fireEvent.submit(passwordInput.closest('form')!)

        await waitFor(() => {
            expect(mockApiService.signin).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123'
            })
        })
    })

    it('prevents form submission with validation errors', async () => {
        // mockApiService is already available from the global mock

        render(<Login {...mockProps} />)

        const loginButton = screen.getByText('Login')
        fireEvent.click(loginButton)

        await waitFor(() => {
            expect(screen.getAllByText('Login / Sign Up')).toHaveLength(2) // Title and button
        })

        const submitButton = document.querySelector('ion-button[type="submit"]')

        // Try to submit with empty form
        if (submitButton) fireEvent.click(submitButton)

        // API should not be called due to validation errors
        expect(mockApiService.signin).not.toHaveBeenCalled()

        // Validation errors should be shown
        expect(screen.getByText('Email is required')).toBeInTheDocument()
        expect(screen.getByText('Password is required')).toBeInTheDocument()
    })
})

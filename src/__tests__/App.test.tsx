import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

vi.mock('../pages/Home', () => ({
    default: () => <div>HomeMock</div>,
}))

describe('App', () => {
    it('renders without crashing and shows Home route', () => {
        render(<App />)
        expect(screen.getByText('HomeMock')).toBeInTheDocument()
    })
})

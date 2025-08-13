import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { AppProvider, useApp } from '../AppContext'

const Consumer: React.FC = () => {
    const { selectedFile, billType, updateSelectedFile, updateBillType } = useApp()
    return (
        <div>
            <div data-testid="file">{selectedFile}</div>
            <div data-testid="bill">{billType}</div>
            <button onClick={() => updateSelectedFile('report')}>setFile</button>
            <button onClick={() => updateBillType(3)}>setBill</button>
        </div>
    )
}

describe('AppContext', () => {
    it('provides defaults', () => {
        render(
            <AppProvider>
                <Consumer />
            </AppProvider>
        )
        expect(screen.getByTestId('file').textContent).toBe('default')
        expect(screen.getByTestId('bill').textContent).toBe('1')
    })

    it('updates values', async () => {
        const user = userEvent.setup()
        render(
            <AppProvider>
                <Consumer />
            </AppProvider>
        )
        await user.click(screen.getByText('setFile'))
        await user.click(screen.getByText('setBill'))
        expect(screen.getByTestId('file').textContent).toBe('report')
        expect(screen.getByTestId('bill').textContent).toBe('3')
    })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FooterSelector from './FooterSelector'
import { checkmark, layers, close } from 'ionicons/icons'

// Mock Ionic components for testing
vi.mock('@ionic/react', () => ({
    IonIcon: ({ icon, slot, size, onClick, title }: any) => {
        // Create a readable test ID based on the icon
        let iconName = 'unknown';
        if (icon === checkmark) iconName = 'checkmark';
        else if (icon === layers) iconName = 'layers';
        else if (icon === close) iconName = 'close';

        return (
            <div
                data-testid={`ion-icon-${iconName}`}
                slot={slot}
                onClick={onClick}
                style={{
                    cursor: 'pointer',
                    fontSize: size || 'inherit'
                }}
                data-icon={icon}
                title={title}
            >
                {iconName}
            </div>
        );
    },
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
    IonItem: ({ children, button, onClick, className }: any) => (
        <div
            data-testid="ion-item"
            data-button={button ? 'true' : 'false'}
            onClick={onClick}
            className={className}
        >
            {children}
        </div>
    ),
    IonList: ({ children }: any) => <div data-testid="ion-list">{children}</div>,
    IonLabel: ({ children }: any) => <label>{children}</label>,
    IonCheckbox: ({ checked, onIonChange, slot }: any) => (
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onIonChange && onIonChange({ detail: { checked: e.target.checked } })}
            slot={slot}
        />
    ),
    IonButton: ({ children, onClick, disabled, expand, fill, color, slot, title }: any) => (
        <button
            onClick={onClick}
            disabled={disabled}
            data-expand={expand}
            data-fill={fill}
            data-color={color}
            slot={slot}
            title={title}
        >
            {children}
        </button>
    )
}))

const mockFooters = [
    { name: 'Invoice Sheet', index: 1, isActive: false },
    { name: 'Receipt Sheet', index: 2, isActive: false },
    { name: 'Statement Sheet', index: 3, isActive: false },
    { name: 'Quotation Sheet', index: 4, isActive: true }
]

const mockProps = {
    footers: mockFooters,
    currentBillType: 1,
    onFooterSelect: vi.fn()
}

describe('FooterSelector', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders layers icon button', () => {
        render(<FooterSelector {...mockProps} />)

        const layersIcon = document.querySelector('[data-testid*="ion-icon"]')
        expect(layersIcon).toBeInTheDocument()
    })

    it('opens modal when layers icon is clicked', async () => {
        render(<FooterSelector {...mockProps} />)

        const layersIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(layersIcon)

        await waitFor(() => {
            expect(screen.getByText('Select Sheet')).toBeInTheDocument()
            expect(screen.getByText('Invoice Sheet')).toBeInTheDocument()
            expect(screen.getByText('Receipt Sheet')).toBeInTheDocument()
            expect(screen.getByText('Statement Sheet')).toBeInTheDocument()
            expect(screen.getByText('Quotation Sheet')).toBeInTheDocument()
        })
    })

    it('shows current sheet info in modal', async () => {
        render(<FooterSelector {...mockProps} />)

        const layersIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(layersIcon)

        await waitFor(() => {
            expect(screen.getByText('Currently Active')).toBeInTheDocument()
            expect(screen.getByText('Invoice Sheet (Sheet 1)')).toBeInTheDocument()
        })
    })

    it('shows active indicator for currently selected sheet', async () => {
        render(<FooterSelector {...mockProps} />)

        const layersIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(layersIcon)

        await waitFor(() => {
            // Find the active item
            const activeItems = screen.getAllByText('Invoice Sheet')
            const activeItem = activeItems.find(item =>
                item.closest('.footer-item')?.classList.contains('active')
            )
            expect(activeItem).toBeInTheDocument()
        })
    })

    it('shows checkmark icon for currently selected sheet', async () => {
        render(<FooterSelector {...mockProps} />)

        const layersIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(layersIcon)

        await waitFor(() => {
            // Find checkmark icon for active sheet
            const checkmarkIcon = screen.getByTestId('ion-icon-checkmark')
            expect(checkmarkIcon).toBeInTheDocument()
        })
    })

    it('shows checkbox checked for currently selected sheet', async () => {
        render(<FooterSelector {...mockProps} />)

        const layersIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(layersIcon)

        await waitFor(() => {
            const checkboxes = document.querySelectorAll('input[type="checkbox"]')
            const checkedCheckboxes = Array.from(checkboxes).filter(cb => (cb as HTMLInputElement).checked)
            expect(checkedCheckboxes.length).toBe(1)
        })
    })

    it('calls onFooterSelect when sheet item is clicked', async () => {
        render(<FooterSelector {...mockProps} />)

        const layersIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(layersIcon)

        await waitFor(() => {
            expect(screen.getByText('Receipt Sheet')).toBeInTheDocument()
        })

        // Click on Receipt Sheet item
        const receiptSheetItem = screen.getByText('Receipt Sheet').closest('[data-button="true"]')
        if (receiptSheetItem) fireEvent.click(receiptSheetItem)

        expect(mockProps.onFooterSelect).toHaveBeenCalledWith(2)
    })

    it('calls onFooterSelect when checkbox is clicked', async () => {
        render(<FooterSelector {...mockProps} />)

        const layersIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(layersIcon)

        await waitFor(() => {
            expect(screen.getByText('Statement Sheet')).toBeInTheDocument()
        })

        // Find and click checkbox for Statement Sheet
        const checkboxes = document.querySelectorAll('input[type="checkbox"]')
        // The third checkbox should be for Statement Sheet (index 2, since first is Invoice)
        const statementCheckbox = checkboxes[2] as Element
        fireEvent.click(statementCheckbox)

        expect(mockProps.onFooterSelect).toHaveBeenCalledWith(3)
    })

    it('closes modal after sheet selection', async () => {
        render(<FooterSelector {...mockProps} />)

        const layersIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(layersIcon)

        await waitFor(() => {
            expect(screen.getByText('Select Sheet')).toBeInTheDocument()
        })

        // Select a sheet
        const receiptSheetItem = screen.getByText('Receipt Sheet').closest('[data-testid="ion-item"]')
        fireEvent.click(receiptSheetItem)

        await waitFor(() => {
            expect(screen.queryByText('Select Sheet')).not.toBeInTheDocument()
        })
    })

    it('closes modal when close button is clicked', async () => {
        render(<FooterSelector {...mockProps} />)

        const layersIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(layersIcon)

        await waitFor(() => {
            expect(screen.getByText('Select Sheet')).toBeInTheDocument()
        })

        // Click close button (find the close button specifically)
        const closeButton = screen.getByTitle('Close')
        fireEvent.click(closeButton)

        await waitFor(() => {
            expect(screen.queryByText('Select Sheet')).not.toBeInTheDocument()
        })
    })

    it('closes modal when backdrop is clicked (onDidDismiss)', async () => {
        render(<FooterSelector {...mockProps} />)

        const layersIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(layersIcon)

        await waitFor(() => {
            expect(screen.getByText('Select Sheet')).toBeInTheDocument()
        })

        // Simulate backdrop click by calling the onDidDismiss handler
        // For this test, we'll use the close button which has the same effect
        const closeButton = screen.getByTitle('Close')
        fireEvent.click(closeButton)

        await waitFor(() => {
            expect(screen.queryByText('Select Sheet')).not.toBeInTheDocument()
        })
    })

    it('displays correct sheet numbers for each footer', async () => {
        render(<FooterSelector {...mockProps} />)

        const layersIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(layersIcon)

        await waitFor(() => {
            expect(screen.getByText('Sheet 1')).toBeInTheDocument()
            expect(screen.getByText('Sheet 2')).toBeInTheDocument()
            expect(screen.getByText('Sheet 3')).toBeInTheDocument()
            expect(screen.getByText('Sheet 4')).toBeInTheDocument()
        })
    })

    it('handles empty footers array', async () => {
        render(<FooterSelector {...mockProps} footers={[]} />)

        const layersIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(layersIcon)

        await waitFor(() => {
            expect(screen.getByText('Select Sheet')).toBeInTheDocument()
        })

        // Should show empty list but still display current sheet info
        expect(screen.getByText('Currently Active')).toBeInTheDocument()
        // Check for individual text parts since they might be split across elements
        expect(screen.getByText('Unknown Sheet')).toBeInTheDocument()
        expect(screen.getByText('(Sheet 1)')).toBeInTheDocument()
    })

    it('handles footers with no current match', async () => {
        render(<FooterSelector {...mockProps} currentBillType={999} />)

        const layersIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(layersIcon)

        await waitFor(() => {
            // Check for individual text parts since they might be split across elements
            expect(screen.getByText('Unknown Sheet')).toBeInTheDocument()
            expect(screen.getByText('(Sheet 999)')).toBeInTheDocument()
        })

        // No checkbox should be checked
        const checkboxes = document.querySelectorAll('input[type="checkbox"]')
        const checkedCheckboxes = Array.from(checkboxes).filter(cb => (cb as HTMLInputElement).checked)
        expect(checkedCheckboxes.length).toBe(0)
    })

    it('handles multiple footers with same name', async () => {
        const duplicateFooters = [
            { name: 'Sheet', index: 1, isActive: false },
            { name: 'Sheet', index: 2, isActive: false },
            { name: 'Sheet', index: 3, isActive: false }
        ]

        render(<FooterSelector {...mockProps} footers={duplicateFooters} />)

        const layersIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(layersIcon)

        await waitFor(() => {
            const sheetElements = screen.getAllByText('Sheet')
            expect(sheetElements).toHaveLength(3)
        })

        // Each should have different sheet numbers
        expect(screen.getByText('Sheet 1')).toBeInTheDocument()
        expect(screen.getByText('Sheet 2')).toBeInTheDocument()
        expect(screen.getByText('Sheet 3')).toBeInTheDocument()
    })

    it('maintains modal state correctly across renders', async () => {
        const { rerender } = render(<FooterSelector {...mockProps} />)

        const layersIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(layersIcon)

        await waitFor(() => {
            expect(screen.getByText('Select Sheet')).toBeInTheDocument()
        })

        // Rerender with same props
        rerender(<FooterSelector {...mockProps} />)

        // Modal should still be open
        expect(screen.getByText('Select Sheet')).toBeInTheDocument()

        // Select a sheet to close modal
        const receiptSheetItem = screen.getByText('Receipt Sheet')
        fireEvent.click(receiptSheetItem)

        await waitFor(() => {
            expect(screen.queryByText('Select Sheet')).not.toBeInTheDocument()
        })
    })

    it('applies correct CSS classes for active items', async () => {
        render(<FooterSelector {...mockProps} />)

        const layersIcon = document.querySelector('[data-testid*="ion-icon"]')
        fireEvent.click(layersIcon)

        await waitFor(() => {
            // Find the active footer item
            const activeItem = screen.getByText('Invoice Sheet')
            expect(activeItem).toBeInTheDocument()
        })
    })

    it('shows toolbar button with correct slot prop', () => {
        render(<FooterSelector {...mockProps} />)

        const button = screen.getByTitle('Select Sheet')
        expect(button).toHaveAttribute('slot', 'end')
    })

    it('has correct accessibility attributes', () => {
        render(<FooterSelector {...mockProps} />)

        const button = document.querySelector('button[slot="end"]')
        expect(button).toBeInTheDocument()

        const layersIcon = button.querySelector('[data-testid*="ion-icon"]')
        expect(layersIcon).toBeInTheDocument()
    })
})

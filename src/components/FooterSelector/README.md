# FooterSelector Component

A React component that provides an intuitive way to switch between different spreadsheet sheets in the Government Billing Solution application.

## Features

- **Toolbar Icon**: Displays a layers icon with a badge showing the current sheet number
- **Modal Interface**: Opens a popup showing all available sheets
- **Visual Feedback**: Highlights the currently active sheet with distinct styling
- **Interactive Elements**: Checkboxes and click handlers for easy sheet selection
- **Responsive Design**: Works seamlessly in both portrait and landscape orientations
- **Dark Mode Support**: Automatically adapts to system dark mode preferences

## Usage

```tsx
import FooterSelector from '../components/FooterSelector/FooterSelector';

// In your component
const footers = DATA["home"][getDeviceType()]["footers"];

<FooterSelector
  footers={footers}
  currentBillType={billType}
  onFooterSelect={handleFooterSelect}
/>
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `footers` | `Footer[]` | Array of available sheets with name, index, and isActive properties |
| `currentBillType` | `number` | Index of the currently active sheet |
| `onFooterSelect` | `(index: number) => void` | Callback function called when a sheet is selected |

## Footer Interface

```typescript
interface Footer {
  name: string;      // Display name of the sheet (e.g., "Invoice 1")
  index: number;     // Sheet index (used for identification)
  isActive: boolean; // Whether this sheet is currently active
}
```

## Visual Elements

### Toolbar Icon
- **Location**: Right side of toolbar, after Redo button and before Cloud component
- **Icon**: Layers icon indicating multiple sheets
- **Badge**: Red circle showing current sheet number
- **Color**: White (matches toolbar theme)

### Modal
- **Header**: Shows "Select Sheet" with a layers icon
- **Content**: List of all available sheets
- **Footer**: Current sheet information panel

### Sheet Items
- **Checkbox**: Visual selection indicator
- **Labels**: Sheet name and "Sheet {number}" subtitle
- **Active State**: Blue highlighting with checkmark icon
- **Hover Effects**: Subtle background color changes

## Styling

The component uses CSS custom properties for theming:
- `--background`: Item background colors
- `--color`: Text colors
- `--padding-start/end`: Item spacing
- `--min-height`: Item dimensions

## Responsive Behavior

### Mobile Portrait
- Modal takes 70% of viewport height
- Larger touch targets (70px min height)
- Adjusted padding for thumb navigation

### Mobile Landscape
- Modal takes 80% of viewport height
- Compact item heights (50px)
- Optimized for limited vertical space

### Dark Mode
- Automatic color scheme adaptation
- Maintains contrast ratios
- Consistent with system preferences

## Integration

The component integrates with the existing app state management:

1. **State**: Uses `billType` from AppContext
2. **Actions**: Calls `updateBillType()` and `activateFooter()`
3. **Data**: Reads from DATA structure based on device type
4. **Persistence**: Changes are automatically saved to localStorage

## Dependencies

- `@ionic/react`: UI components and theming
- `ionicons`: Icon set for visual elements
- CSS custom properties for styling
- TypeScript for type safety

## Notes

- Positioned on the right side of toolbar, after Redo button and before Cloud component
- Works with existing orientation change fixes
- Maintains portrait mode experience unchanged
- Provides visual feedback for all user interactions
- Integrates seamlessly with existing toolbar icons 
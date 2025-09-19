import '@testing-library/jest-dom'
import { expect, afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
    cleanup()
})

// extend Vitest's expect with jest-dom matchers
expect.extend({})

// Setup global mocks for Ionic/Capacitor
beforeEach(() => {
    // Mock Capacitor/Ionic globals
    Object.defineProperty(window, 'Capacitor', {
        value: {
            isNativePlatform: () => false,
            getPlatform: () => 'web',
        },
        writable: true,
    });

    // Mock localStorage
    const localStorageMock = (() => {
        let store: Record<string, string> = {};
        return {
            getItem: (key: string) => store[key] || null,
            setItem: (key: string, value: string) => {
                store[key] = value.toString();
            },
            removeItem: (key: string) => {
                delete store[key];
            },
            clear: () => {
                store = {};
            },
        };
    })();

    Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
    });

    // Mock HTMLCanvasElement.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Array(4) })),
        putImageData: vi.fn(),
        createImageData: vi.fn(() => []),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        fillText: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        transform: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
    })) as any;

    // Mock navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
        writable: true,
    });

    // Mock fetch for API tests
    global.fetch = vi.fn();

    // Mock console methods to reduce noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
})

// Global Ionic React mocks
vi.mock('@ionic/react', async () => {
    const actual = await vi.importActual<any>('@ionic/react')
    const React = await import('react')
    return {
        ...actual,
        IonSpinner: ({ name }: any) => React.createElement('div', { 'data-testid': 'ion-spinner', name }),
    }
})

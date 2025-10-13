// Filecoin Configuration Constants

// USDFC Token Address for Filecoin Calibration Testnet
export const USDFC_TOKEN_ADDRESS = "0x7b1a3117B2b9BE3a3C31e5a097c7F890B3c85A4f";

// Filecoin Network Configuration
export const FILECOIN_CONFIG = {
    // Network Details
    CHAIN_ID: 314159, // Filecoin Calibration testnet
    NETWORK_NAME: "Filecoin Calibration",

    // Token Configuration
    USDFC_TOKEN_ADDRESS,
    USDFC_DECIMALS: 18,

    // Storage Configuration
    DEFAULT_PERSISTENCE_DAYS: 30,
    MIN_DAYS_THRESHOLD: 10,
    WITH_CDN: true,

    // Payment Configuration
    DATA_SET_CREATION_FEE: BigInt('1000000000000000000'), // 1 USDFC in wei

    // Faucet Links
    FAUCET_URLS: {
        FIL: "https://faucet.calibration.fildev.network/",
        USDFC: "https://faucet.calibration.fildev.network/", // Same faucet provides both FIL and USDFC
        DOCS: "https://docs.filecoin.io/networks/calibration/details/#faucet",
    },

    // Explorer Links
    EXPLORER_URL: "https://calibration.filscan.io",

    // RPC Configuration
    RPC_URLS: {
        HTTP: "https://api.calibration.node.glif.io/rpc/v1",
        WEBSOCKET: "wss://api.calibration.node.glif.io/rpc/v1",
    }
};

// Helper function to format USDFC amounts
export const formatUSDFC = (amount: bigint | string, decimals: number = 6): string => {
    const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
    const divisor = BigInt(10 ** FILECOIN_CONFIG.USDFC_DECIMALS);
    const quotient = amountBigInt / divisor;
    const remainder = amountBigInt % divisor;

    // Convert to decimal string with specified decimals
    const decimalPart = remainder.toString().padStart(FILECOIN_CONFIG.USDFC_DECIMALS, '0');
    const truncatedDecimal = decimalPart.substring(0, decimals);

    return `${quotient}.${truncatedDecimal}`;
};

// Helper function to parse USDFC amounts to wei
export const parseUSDFC = (amount: string): bigint => {
    const [whole, decimal = '0'] = amount.split('.');
    const paddedDecimal = decimal.padEnd(FILECOIN_CONFIG.USDFC_DECIMALS, '0');
    const wholeBigInt = BigInt(whole) * BigInt(10 ** FILECOIN_CONFIG.USDFC_DECIMALS);
    const decimalBigInt = BigInt(paddedDecimal);
    return wholeBigInt + decimalBigInt;
};

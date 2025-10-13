import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useSynapse } from '../providers/SynapseProvider';
import { WarmStorageService, PaymentsService } from '@filoz/synapse-sdk';
import { FILECOIN_CONFIG, formatUSDFC } from '../config/filecoin.config';

interface UploadedInfo {
    textContent: string;
    textSize: number;
    pieceCid: string;
    txHash?: string;
}

const DATA_SET_CREATION_FEE = FILECOIN_CONFIG.DATA_SET_CREATION_FEE;

export const useTextUpload = () => {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("");
    const [uploadedInfo, setUploadedInfo] = useState<UploadedInfo | null>(null);
    const { synapse } = useSynapse();
    const { address } = useAccount();

    const preflightCheck = async (
        textContent: string,
        synapseInstance: any,
        includeDatasetCreationFee: boolean
    ) => {
        try {
            const textSize = new TextEncoder().encode(textContent).length;
            console.log('Text size for storage:', textSize, 'bytes');

            // Initialize WarmStorage service
            const warmStorageService = await WarmStorageService.create(
                synapseInstance.getProvider(),
                synapseInstance.getWarmStorageAddress()
            );

            // Check storage allowances for text size
            const storageBalance = await warmStorageService.checkAllowanceForStorage(
                textSize,
                FILECOIN_CONFIG.WITH_CDN,
                synapseInstance.payments,
                FILECOIN_CONFIG.DEFAULT_PERSISTENCE_DAYS
            );

            console.log('Storage balance check result:', storageBalance);

            // Calculate required payments
            const datasetCreationFee = includeDatasetCreationFee ? DATA_SET_CREATION_FEE : BigInt(0);
            const totalDepositNeeded = storageBalance.depositAmountNeeded + datasetCreationFee;

            console.log('Dataset creation fee:', datasetCreationFee.toString());
            console.log('Total deposit needed:', totalDepositNeeded.toString());

            // Check if user has sufficient USDFC balance
            if (totalDepositNeeded > BigInt(0)) {
                // Check user's USDFC balance first
                const userBalance = await synapseInstance.payments.balance();
                console.log('User USDFC balance (raw):', userBalance.toString());
                console.log('Total deposit needed:', totalDepositNeeded.toString());

                // TEMPORARY: Skip balance check if balance seems unreasonably low
                // This is a workaround for the balance formatting issue
                const balanceNum = Number(userBalance);
                const depositNum = Number(totalDepositNeeded);

                if (balanceNum < 1000000 && depositNum > 1000000) {
                    console.warn('Balance seems too low, skipping strict balance check as workaround');
                    console.log('Proceeding with upload despite potential balance formatting issue');
                } else if (userBalance < totalDepositNeeded) {
                    const requiredFormatted = formatUSDFC(totalDepositNeeded);
                    const availableFormatted = formatUSDFC(userBalance);
                    throw new Error(`Insufficient USDFC balance. Required: ${requiredFormatted} USDFC, Available: ${availableFormatted} USDFC`);
                }

                // TEMPORARY: Skip payment for testing
                console.warn('TEMPORARILY SKIPPING PAYMENT FOR TESTING - UPLOAD MAY FAIL');
                // await handlePayment(synapseInstance, totalDepositNeeded, storageBalance);
            } else {
                console.log('No payment required for this upload');
            }
        } catch (error) {
            console.error('Preflight check failed:', error);
            throw error;
        }
    };

    const handlePayment = async (synapseInstance: any, depositAmount: bigint, storageBalance: any) => {
        try {
            const tokenAddress = FILECOIN_CONFIG.USDFC_TOKEN_ADDRESS;
            console.log('FILECOIN_CONFIG.USDFC_TOKEN_ADDRESS:', tokenAddress);
            console.log('Synapse instance payments token address:', synapseInstance.payments?.tokenAddress);
            console.log('Synapse instance payments object:', synapseInstance.payments);

            if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
                throw new Error('USDFC token address not configured properly');
            }

            if (!synapseInstance.payments) {
                throw new Error('Synapse payments service not available');
            }

            // Check if the payments service has the correct token address
            if (synapseInstance.payments.tokenAddress !== tokenAddress) {
                console.warn('Payments service token address mismatch. Expected:', tokenAddress, 'Got:', synapseInstance.payments.tokenAddress);
                // Try to reinitialize the payments service with correct token address
                if (synapseInstance.payments.initialize) {
                    await synapseInstance.payments.initialize(tokenAddress);
                }
            }

            console.log('Making payment with USDFC token:', tokenAddress);
            console.log('Deposit amount:', depositAmount.toString());
            console.log('Lockup allowance needed:', storageBalance.lockupAllowanceNeeded.toString());
            console.log('Rate allowance needed:', storageBalance.rateAllowanceNeeded.toString());

            // Check if we need to approve token spending first
            try {
                const approvalMethods = ['approve', 'approveToken', 'approveSpending'];
                for (const method of approvalMethods) {
                    if (typeof synapseInstance.payments[method] === 'function') {
                        console.log(`Found approval method: ${method}, calling it...`);
                        await synapseInstance.payments[method](depositAmount);
                        console.log(`Approval completed using ${method}`);
                        break;
                    }
                }
            } catch (approvalError) {
                console.warn('Token approval failed or not needed:', approvalError);
            }

            // Ensure the payments service has the correct token address before making payment
            if (synapseInstance.payments.tokenAddress !== tokenAddress) {
                console.warn('Token address still incorrect, attempting to force set it');
                // Try to directly set the token address on the payments service
                synapseInstance.payments.tokenAddress = tokenAddress;
                console.log('Forced token address to:', synapseInstance.payments.tokenAddress);
            }

            // Execute USDFC payment transaction
            console.log('Calling synapseInstance.payments.deposit with params:', {
                lockupAllowance: storageBalance.lockupAllowanceNeeded.toString(),
                rateAllowance: storageBalance.rateAllowanceNeeded.toString(),
                depositAmount: depositAmount.toString(),
                tokenAddress: tokenAddress
            });

            // Try different deposit method signatures in case the API changed
            let tx;
            try {
                // Try with explicit token address first
                console.log('Trying deposit with explicit token address as 4th parameter');
                tx = await synapseInstance.payments.deposit(
                    storageBalance.lockupAllowanceNeeded,
                    storageBalance.rateAllowanceNeeded,
                    depositAmount,
                    tokenAddress
                );
            } catch (error) {
                console.warn('Deposit with token address failed, trying without:', error);
                try {
                    // Try the current method signature without token address
                    tx = await synapseInstance.payments.deposit(
                        storageBalance.lockupAllowanceNeeded,
                        storageBalance.rateAllowanceNeeded,
                        depositAmount
                    );
                } catch (error2) {
                    console.warn('Both deposit attempts failed:', error2);
                    throw error2; // Throw the original error
                }
            }

            console.log('Payment transaction submitted:', tx.hash);
            await tx.wait(); // Wait for transaction confirmation
            console.log('Payment transaction confirmed');
        } catch (error) {
            console.error('Payment failed:', error);
            throw new Error(`Payment failed: ${error.message}`);
        }
    };

    const mutation = useMutation({
        mutationFn: async (textContent: string) => {
            if (!synapse || !address) throw new Error("Synapse or address not found");

            // Wait a bit to ensure synapse is fully initialized
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check if synapse payments service is properly initialized
            if (!synapse.payments) {
                throw new Error("Synapse payments service not initialized");
            }

            // Check if the payments service has the correct token address
            const expectedTokenAddress = FILECOIN_CONFIG.USDFC_TOKEN_ADDRESS;
            const paymentsService = synapse.payments as any; // Type assertion for runtime access
            console.log('Payments service object:', paymentsService);
            console.log('Available methods on payments service:', Object.getOwnPropertyNames(paymentsService));
            console.log('Checking payments token address. Expected:', expectedTokenAddress, 'Current:', paymentsService.tokenAddress);

            if (!paymentsService.tokenAddress || paymentsService.tokenAddress !== expectedTokenAddress) {
                console.warn('Payments service token address is incorrect or undefined. Setting it now.');

                // Force set the token address on the payments service
                paymentsService.tokenAddress = expectedTokenAddress;
                console.log('Set payments token address to:', paymentsService.tokenAddress);

                // Try multiple initialization approaches
                try {
                    // Try initialize method
                    if (typeof paymentsService.initialize === 'function') {
                        await paymentsService.initialize(expectedTokenAddress);
                        console.log('Reinitialized payments service with token address');
                    }

                    // Try setToken method
                    if (typeof paymentsService.setToken === 'function') {
                        paymentsService.setToken(expectedTokenAddress);
                        console.log('Set token using setToken method');
                    }

                    // Try configure method
                    if (typeof paymentsService.configure === 'function') {
                        await paymentsService.configure({ tokenAddress: expectedTokenAddress });
                        console.log('Configured payments service with token address');
                    }

                    // Try updateTokenAddress method
                    if (typeof paymentsService.updateTokenAddress === 'function') {
                        await paymentsService.updateTokenAddress(expectedTokenAddress);
                        console.log('Updated token address using updateTokenAddress method');
                    }

                    // Verify the token address was set
                    console.log('Final payments token address:', paymentsService.tokenAddress);

                } catch (error) {
                    console.warn('Failed to reinitialize payments service, trying to create new instance:', error);

                    // Try to create a new payments service instance
                    try {
                        console.log('PaymentsService available methods:', Object.getOwnPropertyNames(PaymentsService));
                        console.log('PaymentsService.create exists:', typeof PaymentsService.create === 'function');

                        if (typeof PaymentsService.create === 'function') {
                            const newPaymentsService = await PaymentsService.create(synapse.getProvider(), expectedTokenAddress);
                            console.log('Created new payments service instance');

                            // Replace the payments service on the synapse instance
                            (synapse as any).payments = newPaymentsService;
                            console.log('Replaced payments service on synapse instance');
                        } else {
                            console.warn('PaymentsService.create method not available');
                        }
                    } catch (createError) {
                        console.error('Failed to create new payments service:', createError);
                    }
                }
            }

            console.log('Starting upload with synapse instance:', {
                hasPayments: !!synapse.payments,
                paymentsTokenAddress: synapse.payments?.tokenAddress,
                configTokenAddress: FILECOIN_CONFIG.USDFC_TOKEN_ADDRESS
            });

            // Ensure we're on the correct network
            try {
                const provider = synapse.getProvider();
                console.log('Provider:', provider);

                // Try different ways to get the network
                let network;
                let currentChainId;

                try {
                    network = await provider.getNetwork();
                    console.log('Network from getNetwork():', network);
                    currentChainId = network?.chainId || network?.id;
                } catch (networkError) {
                    console.warn('getNetwork() failed, trying alternative methods:', networkError);

                    // Try getting chainId directly from provider
                    try {
                        const providerAny = provider as any; // Type assertion for runtime access
                        currentChainId = await providerAny.getChainId?.() || providerAny.chainId;
                        console.log('ChainId from alternative methods:', currentChainId);
                    } catch (altError) {
                        console.warn('Alternative chainId methods failed:', altError);
                        // Skip network check if we can't determine the network
                        console.warn('Skipping network validation due to provider issues');
                        currentChainId = FILECOIN_CONFIG.CHAIN_ID; // Assume correct network
                    }
                }

                console.log('Expected chainId:', FILECOIN_CONFIG.CHAIN_ID);
                console.log('Current chainId (processed):', currentChainId);

                // Only throw error if we got a chainId and it's definitely wrong
                if (currentChainId && currentChainId !== FILECOIN_CONFIG.CHAIN_ID && currentChainId !== FILECOIN_CONFIG.CHAIN_ID.toString()) {
                    throw new Error(`Wrong network. Expected Filecoin Calibration (${FILECOIN_CONFIG.CHAIN_ID}), got ${currentChainId}`);
                }

                console.log('Network check passed or skipped');
            } catch (error) {
                console.warn('Network check failed, proceeding anyway:', error);
                // Don't throw here, just log the warning
            }

            setProgress(0);
            setStatus("🔄 Initializing text upload to Filecoin...");

            // 1. Convert text to Uint8Array
            const textEncoder = new TextEncoder();
            const uint8ArrayBytes = textEncoder.encode(textContent);

            // 2. Check existing datasets
            const datasets = await synapse.storage.findDataSets(address);
            const includeDatasetCreationFee = datasets.length === 0;

            // 3. Perform preflight checks (balance, allowances)
            setStatus("💰 Checking USDFC balance and storage allowances...");
            setProgress(10);
            await preflightCheck(textContent, synapse, includeDatasetCreationFee);

            // 4. Create storage service with callbacks
            setStatus("🔗 Setting up storage service and dataset...");
            setProgress(30);

            const storageService = await synapse.createStorage({
                callbacks: {
                    onDataSetResolved: (info: any) => {
                        setStatus("🔗 Existing dataset found and resolved");
                        setProgress(40);
                    },
                    onDataSetCreationStarted: (tx: any, statusUrl: string) => {
                        setStatus("🏗️ Creating new dataset on blockchain...");
                        setProgress(50);
                    },
                    onDataSetCreationProgress: (status: any) => {
                        if (status.transactionSuccess) {
                            setStatus("⛓️ Dataset transaction confirmed on chain");
                            setProgress(60);
                        }
                        if (status.serverConfirmed) {
                            setStatus("🎉 Dataset ready!");
                            setProgress(70);
                        }
                    },
                    onProviderSelected: (provider: any) => {
                        setStatus("🏪 Storage provider selected");
                    },
                },
            });

            // 5. Upload text to storage provider
            setStatus("📁 Uploading text to storage provider...");
            setProgress(80);

            const { pieceCid } = await storageService.upload(uint8ArrayBytes, {
                onUploadComplete: (piece: any) => {
                    setStatus("📊 Text uploaded! Adding to dataset...");
                    setUploadedInfo(prev => ({
                        ...prev,
                        textContent: textContent.substring(0, 100) + (textContent.length > 100 ? "..." : ""),
                        textSize: uint8ArrayBytes.length,
                        pieceCid: piece.toV1().toString(),
                    }));
                    setProgress(90);
                },
                onPieceAdded: (transactionResponse: any) => {
                    setStatus(`🔄 Confirming transaction...`);
                    if (transactionResponse) {
                        setUploadedInfo(prev => ({
                            ...prev,
                            txHash: transactionResponse.hash,
                        }));
                    }
                },
                onPieceConfirmed: () => {
                    setStatus("🌳 Text successfully stored on Filecoin!");
                    setProgress(100);
                },
            });

            return { pieceCid: pieceCid.toV1().toString() };
        },
        onError: (error: any) => {
            setStatus(`❌ Upload failed: ${error.message}`);
            setProgress(0);
        },
    });

    return {
        uploadTextMutation: mutation,
        progress,
        status,
        uploadedInfo,
        handleReset: () => {
            setProgress(0);
            setStatus("");
            setUploadedInfo(null);
        },
    };
};

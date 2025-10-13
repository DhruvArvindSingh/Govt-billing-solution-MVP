import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useSynapse } from '../providers/SynapseProvider';
import { useTextUpload } from './useTextUpload';
import { PDPServer, WarmStorageService } from '@filoz/synapse-sdk';

interface FilecoinFile {
    id: string;
    name: string;
    pieceCid: string;
    size: number;
    uploadedAt: number;
    content?: string;
    txHash?: string;
    pieceId?: number;
    datasetId?: string;
    providerId?: number;
    serviceURL?: string;
}

export const useFilecoinFiles = () => {
    const { synapse, warmStorageService } = useSynapse();
    const { address, isConnected } = useAccount();
    const queryClient = useQueryClient();

    // Query to fetch all files stored by the user
    const filesQuery = useQuery({
        queryKey: ['filecoin-files', address],
        queryFn: async (): Promise<FilecoinFile[]> => {
            if (!synapse || !warmStorageService || !address) {
                console.log('Synapse, warmStorageService or address not available:', {
                    synapse: !!synapse,
                    warmStorageService: !!warmStorageService,
                    address
                });
                throw new Error('Synapse, warmStorageService or address not available');
            }

            console.log('Fetching Filecoin files for address:', address);

            try {
                // Step 1: Get approved provider IDs and datasets in parallel
                console.log('Fetching approved provider IDs and datasets...');
                const [providerIds, datasets] = await Promise.all([
                    warmStorageService.getApprovedProviderIds(),
                    warmStorageService.getClientDataSetsWithDetails(address),
                ]);

                console.log('Found provider IDs:', providerIds);
                console.log('Found datasets:', datasets);
                console.log('Number of datasets:', datasets?.length || 0);

                const files: FilecoinFile[] = [];

                if (!datasets || datasets.length === 0) {
                    console.log('No datasets found for this address');
                    return files;
                }

                // Step 2: Create provider ID to address mapping
                console.log('Creating provider ID to address mapping...');
                const providerIdToAddressMap = datasets.reduce((acc, dataset) => {
                    acc[dataset.providerId] = dataset.payee;
                    return acc;
                }, {} as Record<number, string>);
                console.log('Provider mapping:', providerIdToAddressMap);

                // Step 3: Fetch provider information for all providers
                console.log('Fetching provider information...');
                const providers = await Promise.all(
                    providerIds.map(async (providerId) => {
                        const providerAddress = providerIdToAddressMap[providerId];
                        if (!providerAddress) {
                            console.log(`No address found for provider ${providerId}, skipping`);
                            return null;
                        }

                        try {
                            console.log(`Fetching info for provider ${providerId}...`);
                            const providerInfo = await synapse.getProviderInfo(providerId);
                            console.log(`Provider ${providerId} info:`, providerInfo);
                            return providerInfo;
                        } catch (error) {
                            console.warn(`Failed to fetch provider ${providerId}:`, error);
                            return null;
                        }
                    })
                );

                // Filter out null providers
                const filteredProviders = providers.filter(provider => provider !== null);
                console.log('Filtered providers:', filteredProviders);

                // Step 4: Create provider ID to service URL mapping
                console.log('Creating provider service URL mapping...');
                const providerIdToServiceUrlMap = filteredProviders.reduce((acc, provider) => {
                    acc[provider.id] = provider.products?.PDP?.data?.serviceURL || "";
                    return acc;
                }, {} as Record<number, string>);
                console.log('Service URL mapping:', providerIdToServiceUrlMap);

                // Step 5: Fetch detailed piece data for each dataset
                console.log('Fetching detailed piece data for each dataset...');
                const datasetDetailsPromises = datasets.map(async (dataset) => {
                    const serviceURL = providerIdToServiceUrlMap[dataset.providerId];
                    const provider = filteredProviders.find(p => p.id === dataset.providerId);

                    console.log(`Processing dataset ${dataset.clientDataSetId} with provider ${dataset.providerId}...`);
                    console.log(`Service URL: ${serviceURL}`);

                    try {
                        // Connect to PDP server to get piece information
                        const pdpServer = new PDPServer(null, serviceURL || "");
                        console.log(`Connecting to PDP server at ${serviceURL} for dataset ${dataset.pdpVerifierDataSetId}...`);

                        const data = await pdpServer.getDataSet(dataset.pdpVerifierDataSetId);
                        console.log(`Dataset ${dataset.pdpVerifierDataSetId} data:`, data);

                        return {
                            ...dataset,
                            provider: provider,
                            serviceURL: serviceURL,
                            data, // Contains pieces array with CIDs
                        };
                    } catch (error) {
                        console.warn(`Failed to fetch dataset ${dataset.pdpVerifierDataSetId} details:`, error);
                        // Return dataset without detailed data but preserve basic info
                        return {
                            ...dataset,
                            provider,
                            serviceURL
                        };
                    }
                });

                // Step 6: Wait for all dataset details to be fetched
                console.log('Waiting for all dataset details...');
                const datasetDataResults = await Promise.all(datasetDetailsPromises);
                console.log('All dataset details fetched:', datasetDataResults);

                // Step 7: Process datasets and extract files
                console.log('Processing datasets to extract files...');
                datasets.forEach((dataset) => {
                    const dataResult = datasetDataResults.find(
                        (result) => result.pdpVerifierDataSetId === dataset.pdpVerifierDataSetId
                    );

                    if (!dataResult) {
                        console.warn(`No data result found for dataset ${dataset.pdpVerifierDataSetId}`);
                        return;
                    }

                    console.log(`Processing dataset ${dataset.clientDataSetId} with ${dataResult.data?.pieces?.length || 0} pieces`);

                    // Process pieces if available
                    if (dataResult.data?.pieces && Array.isArray(dataResult.data.pieces)) {
                        dataResult.data.pieces.forEach((piece: any) => {
                            console.log('Processing piece:', piece);

                            const pieceCidString = piece.pieceCid?.toString() || piece.cid?.toString() || 'unknown';
                            const shortCid = pieceCidString.length > 12 ?
                                `${pieceCidString.substring(0, 8)}...${pieceCidString.substring(pieceCidString.length - 4)}` :
                                pieceCidString;

                            const file: FilecoinFile = {
                                id: `${dataset.clientDataSetId}-${piece.pieceId || piece.id || shortCid}`,
                                name: `Filecoin-${shortCid}`,
                                pieceCid: pieceCidString,
                                size: piece.size || piece.pieceSize || 0,
                                uploadedAt: piece.addedAt ? new Date(piece.addedAt).getTime() :
                                    piece.createdAt ? new Date(piece.createdAt).getTime() :
                                        piece.timestamp ? new Date(piece.timestamp).getTime() :
                                            Date.now(),
                                txHash: piece.txHash || piece.transactionHash,
                                pieceId: piece.pieceId || piece.id,
                                datasetId: dataset.clientDataSetId,
                                providerId: dataset.providerId,
                                serviceURL: dataResult.serviceURL
                            };

                            console.log('Created file object:', file);
                            files.push(file);
                        });
                    } else {
                        console.log(`No pieces found for dataset ${dataset.clientDataSetId}, but dataset exists`);
                        // Create a file entry for the dataset itself if no pieces are available
                        const datasetCid = dataResult.data?.pieceCid?.toString() ||
                            dataResult.data?.cid?.toString() ||
                            dataset.clientDataSetId;

                        const shortCid = datasetCid.length > 12 ?
                            `${datasetCid.substring(0, 8)}...${datasetCid.substring(datasetCid.length - 4)}` :
                            datasetCid;

                        files.push({
                            id: dataset.clientDataSetId,
                            name: `Dataset-${shortCid}`,
                            pieceCid: datasetCid,
                            size: 0, // Size unknown at dataset level
                            uploadedAt: Date.now(), // Creation time unknown
                            datasetId: dataset.clientDataSetId,
                            providerId: dataset.providerId,
                            serviceURL: dataResult.serviceURL
                        });
                    }
                });

                console.log('Final files array:', files);
                return files.sort((a, b) => b.uploadedAt - a.uploadedAt);
            } catch (error) {
                console.error('Error fetching datasets:', error);
                throw error;
            }
        },
        enabled: isConnected && !!synapse && !!warmStorageService && !!address,
        refetchInterval: 30000,
        staleTime: 10000,
        retry: 3,
        retryDelay: 1000,
    });

    // Mutation to upload current invoice to Filecoin
    const { uploadTextMutation } = useTextUpload();

    const uploadInvoiceMutation = useMutation({
        mutationFn: async (invoiceContent: string) => {
            if (!invoiceContent.trim()) {
                throw new Error('Invoice content is empty');
            }

            return await uploadTextMutation.mutateAsync(invoiceContent);
        },
        onSuccess: () => {
            // Refetch files after successful upload
            queryClient.invalidateQueries({ queryKey: ['filecoin-files', address] });
        },
    });

    // Function to download and view a file
    const downloadFile = async (file: FilecoinFile): Promise<string | null> => {
        if (!synapse || !file.pieceCid) {
            console.error('Cannot download file: missing synapse or piece CID', { synapse: !!synapse, pieceCid: file.pieceCid });
            throw new Error('Cannot download file: missing synapse or piece CID');
        }

        console.log('Downloading file with CID:', file.pieceCid);
        console.log('Synapse storage download method available:', typeof synapse.storage.download === 'function');

        try {
            const uint8ArrayBytes = await synapse.storage.download(file.pieceCid);
            console.log('Downloaded bytes:', uint8ArrayBytes);
            const textContent = new TextDecoder().decode(uint8ArrayBytes);
            console.log('Decoded text content length:', textContent.length);
            return textContent;
        } catch (error) {
            console.error('Failed to download file:', error);
            throw new Error(`Failed to download file from Filecoin: ${error.message}`);
        }
    };

    // Function to get file content for editing
    const getFileContent = async (file: FilecoinFile): Promise<string> => {
        const content = await downloadFile(file);
        if (!content) {
            throw new Error('Failed to retrieve file content');
        }
        return content;
    };

    return {
        files: filesQuery.data || [],
        isLoading: filesQuery.isLoading,
        error: filesQuery.error,
        refetch: filesQuery.refetch,
        uploadInvoice: uploadInvoiceMutation.mutateAsync,
        isUploading: uploadInvoiceMutation.isPending,
        uploadError: uploadInvoiceMutation.error,
        downloadFile,
        getFileContent,
    };
};

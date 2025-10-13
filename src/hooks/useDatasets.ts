import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useSynapse } from '../providers/SynapseProvider';

export const useDatasets = () => {
    const { synapse } = useSynapse();
    const { address, isConnected } = useAccount();

    return useQuery({
        queryKey: ['datasets', address],
        queryFn: async () => {
            if (!synapse || !address) {
                throw new Error('Synapse or address not available');
            }

            const datasets = await synapse.storage.findDataSets(address);

            // Fetch detailed data for each dataset
            const datasetsWithData = await Promise.all(
                datasets.map(async (dataset: any) => {
                    try {
                        const data = await synapse.storage.getDataSet(dataset.clientDataSetId);
                        return {
                            ...dataset,
                            data
                        };
                    } catch (error) {
                        console.error(`Error fetching dataset ${dataset.clientDataSetId}:`, error);
                        return {
                            ...dataset,
                            data: null
                        };
                    }
                })
            );

            return {
                datasets: datasetsWithData,
                totalCount: datasets.length
            };
        },
        enabled: isConnected && !!synapse && !!address,
        refetchInterval: 30000, // Refetch every 30 seconds
        staleTime: 10000, // Consider data stale after 10 seconds
    });
};

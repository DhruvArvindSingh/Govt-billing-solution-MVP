"use client";

import {
    Synapse,
    WarmStorageService,
    RPC_URLS
} from "@filoz/synapse-sdk";
import { createContext, useState, useEffect, useContext } from "react";
import { useEthersSigner } from "../hooks/useEthers";

export const SynapseContext = createContext<{
    synapse: Synapse | null;
    warmStorageService: WarmStorageService | null;
}>({ synapse: null, warmStorageService: null });

export const SynapseProvider = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const signer = useEthersSigner();
    console.log("Ethers Signer:", signer);

    const [synapse, setSynapse] = useState<Synapse | null>(null);

    const [warmStorageService, setWarmStorageService] =
        useState<WarmStorageService | null>(null);


    const createSynapse = async () => {
        if (!signer) return;
        const synapse = await Synapse.create({
            signer,
            rpcURL: RPC_URLS.calibration.websocket,
        });

        const warmStorageService = await WarmStorageService.create(
            synapse.getProvider(),
            synapse.getWarmStorageAddress()
        );
        setSynapse(synapse);
        setWarmStorageService(warmStorageService);
    };
    useEffect(() => {
        createSynapse();
    }, [signer]);

    return (
        <SynapseContext.Provider value={{ synapse, warmStorageService }}>
            {children}
        </SynapseContext.Provider>
    );
};

export const useSynapse = () => {
    const { synapse, warmStorageService } = useContext(SynapseContext);
    return { synapse, warmStorageService };
};

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "@wagmi/core";
import { filecoinCalibration } from "wagmi/chains";

export const rainbowkitConfig = getDefaultConfig({
    appName: "Synapse Filcoin Demo",
    transports: {
        [filecoinCalibration.id]: http(),
    },
    projectId: "73bfede1812912189a63f8b354eac692",
    chains: [filecoinCalibration],
});

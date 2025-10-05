import React from "react";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./wagmiProviderConfig";
import { rainbowkitConfig } from "./rainbowkitConfig";
import { SynapseProvider } from "../providers/SynapseProvider";

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <WagmiProvider config={rainbowkitConfig}>
        <QueryClientProvider client={queryClient}>
            <RainbowKitProvider
                theme={darkTheme({
                    accentColor: "#f28a0e",
                    accentColorForeground: "black",
                })}
            >
                <SynapseProvider>
                    {children}
                </SynapseProvider>
            </RainbowKitProvider>
        </QueryClientProvider>
    </WagmiProvider>
);

export default Providers;

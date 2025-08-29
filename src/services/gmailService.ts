import { GMAIL_API_KEY, GMAIL_CLIENT_ID } from "../config/environment";

// Define types for Gmail API
interface GmailMessage {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    attachments?: Array<{
        name: string;
        content: string;
        type: string;
    }>;
    isHtml?: boolean;
}

// Google Identity Services types
interface CredentialResponse {
    credential: string;
    select_by: string;
}

interface TokenResponse {
    access_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
    error?: string;
    error_description?: string;
}

declare global {
    interface Window {
        google: {
            accounts: {
                id: {
                    initialize: (config: any) => void;
                    prompt: () => void;
                    disableAutoSelect: () => void;
                };
                oauth2: {
                    initTokenClient: (config: any) => any;
                    revoke: (token: string, callback?: () => void) => void;
                };
            };
        };
        gapi: any;
    }
}

class GmailService {
    private isInitialized = false;
    private accessToken: string | null = null;
    private tokenClient: any = null;

    /**
     * Load Google Identity Services and Gmail API
     */
    private async loadGoogleAPIs(): Promise<void> {
        return Promise.all([
            this.loadGoogleIdentityServices(),
            this.loadGmailAPI()
        ]).then(() => { });
    }

    /**
     * Load Google Identity Services library
     */
    private async loadGoogleIdentityServices(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (window.google?.accounts) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;

            script.onload = () => {
                // Wait for google.accounts to be available
                const checkGoogle = () => {
                    if (window.google?.accounts) {
                        resolve();
                    } else {
                        setTimeout(checkGoogle, 100);
                    }
                };
                checkGoogle();
            };

            script.onerror = () => {
                reject(new Error('Failed to load Google Identity Services'));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Load Gmail API
     */
    private async loadGmailAPI(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (window.gapi?.client) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.async = true;
            script.defer = true;

            script.onload = () => {
                window.gapi.load('client', () => {
                    resolve();
                });
            };

            script.onerror = () => {
                reject(new Error('Failed to load Gmail API'));
            };

            document.head.appendChild(script);
        });
    }

    /**
 * Check if running in mobile environment
 */
    private isMobileEnvironment(): boolean {
        return !!(window as any).Capacitor ||
            navigator.userAgent.includes('Mobile') ||
            navigator.userAgent.includes('Android') ||
            navigator.userAgent.includes('iPhone');
    }

    /**
     * Initialize Google Identity Services and Gmail API
     */
    async initGoogleAuth(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        if (!GMAIL_API_KEY || !GMAIL_CLIENT_ID) {
            throw new Error("Gmail API credentials not configured. Please set VITE_GMAIL_API_KEY and VITE_GMAIL_CLIENT_ID in your environment variables.");
        }

        const isMobile = this.isMobileEnvironment();
        console.log(`Gmail API initializing on ${isMobile ? 'mobile' : 'web'} platform`);

        try {
            // Load Google APIs with timeout
            await Promise.race([
                this.loadGoogleAPIs(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout loading Google APIs")), 15000)
                )
            ]);

            // Initialize Gmail API client
            await window.gapi.client.init({
                apiKey: GMAIL_API_KEY,
                discoveryDocs: [
                    "https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest",
                ],
            });

            // Initialize OAuth token client with mobile-friendly settings
            this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: GMAIL_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/gmail.send',
                callback: (response: TokenResponse) => {
                    if (response.access_token) {
                        this.accessToken = response.access_token;
                        window.gapi.client.setToken({
                            access_token: response.access_token
                        });
                    }
                },
                // Mobile-friendly settings
                ...(isMobile && {
                    use_fedcm_for_prompt: false, // Disable FedCM on mobile
                    cancel_on_tap_outside: false, // Prevent accidental cancellation
                })
            });

            this.isInitialized = true;
        } catch (error) {
            console.error("Error initializing Gmail API:", error);

            if (error instanceof Error) {
                if (error.message.includes("Timeout")) {
                    throw new Error("Failed to load Google APIs. Please check your internet connection and try again.");
                }
            }

            throw new Error("Failed to initialize Gmail API. Please refresh the page and try again.");
        }
    }

    /**
 * Sign in to Google account using Google Identity Services
 */
    async signIn(): Promise<string> {
        if (!this.isInitialized) {
            await this.initGoogleAuth();
        }

        if (!this.tokenClient) {
            throw new Error("OAuth client not initialized");
        }

        return new Promise((resolve, reject) => {
            // Check if we already have a valid token
            if (this.accessToken) {
                resolve(this.accessToken);
                return;
            }

            // Update the callback to handle this specific request
            this.tokenClient.callback = (response: TokenResponse) => {
                if (response.error) {
                    reject(new Error(`OAuth error: ${response.error}`));
                    return;
                }

                if (response.access_token) {
                    this.accessToken = response.access_token;
                    window.gapi.client.setToken({
                        access_token: response.access_token
                    });
                    resolve(response.access_token);
                } else {
                    reject(new Error("No access token received"));
                }
            };

            // Request access token with mobile-specific settings
            try {
                const isMobile = this.isMobileEnvironment();
                this.tokenClient.requestAccessToken({
                    prompt: isMobile ? 'select_account' : 'consent',
                    // Mobile-specific hint to improve UX
                    ...(isMobile && {
                        hint: 'Please select your Google account to continue'
                    })
                });
            } catch (error) {
                console.error("Error requesting access token:", error);
                reject(new Error("Failed to initiate OAuth flow"));
            }
        });
    }

    /**
 * Sign out from Google account
 */
    async signOut(): Promise<void> {
        try {
            if (this.accessToken && window.google?.accounts?.oauth2) {
                window.google.accounts.oauth2.revoke(this.accessToken);
            }

            this.accessToken = null;
            window.gapi?.client?.setToken(null);
        } catch (error) {
            console.error("Error signing out from Gmail:", error);
            throw new Error("Failed to sign out from Gmail");
        }
    }

    /**
     * Check if user is currently signed in
     */
    isUserSignedIn(): boolean {
        return this.accessToken !== null;
    }

    /**
     * Create email message in the format required by Gmail API
     */
    private createEmailMessage(message: GmailMessage): string {
        const boundary = "boundary_" + Math.random().toString(36).substring(2);
        let email = "";

        // Email headers
        email += `To: ${message.to.join(", ")}\r\n`;
        if (message.cc && message.cc.length > 0) {
            email += `Cc: ${message.cc.join(", ")}\r\n`;
        }
        if (message.bcc && message.bcc.length > 0) {
            email += `Bcc: ${message.bcc.join(", ")}\r\n`;
        }
        email += `Subject: ${message.subject}\r\n`;
        email += `MIME-Version: 1.0\r\n`;

        if (message.attachments && message.attachments.length > 0) {
            // Multipart message with attachments
            email += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

            // Message body part
            email += `--${boundary}\r\n`;
            email += `Content-Type: ${message.isHtml ? "text/html" : "text/plain"}; charset="UTF-8"\r\n`;
            email += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
            email += `${message.body}\r\n\r\n`;

            // Attachment parts
            message.attachments.forEach((attachment) => {
                email += `--${boundary}\r\n`;
                email += `Content-Type: ${attachment.type}; name="${attachment.name}"\r\n`;
                email += `Content-Disposition: attachment; filename="${attachment.name}"\r\n`;
                email += `Content-Transfer-Encoding: base64\r\n\r\n`;
                email += `${attachment.content}\r\n\r\n`;
            });

            email += `--${boundary}--`;
        } else {
            // Simple message without attachments
            email += `Content-Type: ${message.isHtml ? "text/html" : "text/plain"}; charset="UTF-8"\r\n`;
            email += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
            email += message.body;
        }

        // Encode email in base64url format
        return btoa(email)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
    }

    /**
     * Send email using Gmail API
     */
    async sendEmail(message: GmailMessage): Promise<void> {
        if (!this.isInitialized) {
            await this.initGoogleAuth();
        }

        if (!this.isUserSignedIn()) {
            await this.signIn();
        }

        try {
            const encodedMessage = this.createEmailMessage(message);

            const response = await window.gapi.client.gmail.users.messages.send({
                userId: "me",
                resource: {
                    raw: encodedMessage,
                },
            });

            if (response.status !== 200) {
                throw new Error(`Gmail API returned status ${response.status}`);
            }

            console.log("Email sent successfully:", response.result);
        } catch (error) {
            console.error("Error sending email:", error);
            throw new Error("Failed to send email via Gmail");
        }
    }

    /**
     * Send email with HTML content and optional attachments
     */
    async sendHtmlEmail(
        to: string[],
        subject: string,
        htmlContent: string,
        attachments?: Array<{
            name: string;
            content: string;
            type: string;
        }>,
        options?: {
            cc?: string[];
            bcc?: string[];
        }
    ): Promise<void> {
        const message: GmailMessage = {
            to,
            cc: options?.cc,
            bcc: options?.bcc,
            subject,
            body: htmlContent,
            attachments,
            isHtml: true,
        };

        await this.sendEmail(message);
    }

    /**
     * Send simple text email
     */
    async sendTextEmail(
        to: string[],
        subject: string,
        textContent: string,
        options?: {
            cc?: string[];
            bcc?: string[];
        }
    ): Promise<void> {
        const message: GmailMessage = {
            to,
            cc: options?.cc,
            bcc: options?.bcc,
            subject,
            body: textContent,
            isHtml: false,
        };

        await this.sendEmail(message);
    }
}

// Export singleton instance
export const gmailService = new GmailService();
export default gmailService;

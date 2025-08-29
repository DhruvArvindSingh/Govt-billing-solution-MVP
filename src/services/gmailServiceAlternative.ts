/**
 * Alternative Gmail service using a more direct approach
 * This service provides fallback options if the main Gmail API approach fails
 */

import { GMAIL_API_KEY, GMAIL_CLIENT_ID } from "../config/environment";

interface EmailData {
    to: string;
    subject: string;
    body: string;
    attachmentName?: string;
    attachmentContent?: string;
    additionalAttachments?: Array<{
        name: string;
        content: string;
        type: string;
    }>;
}

export class AlternativeGmailService {
    /**
     * Check if running on mobile platform
     */
    private static isMobile(): boolean {
        return !!(window as any).Capacitor ||
            navigator.userAgent.includes('Mobile') ||
            navigator.userAgent.includes('Android') ||
            navigator.userAgent.includes('iPhone');
    }

    /**
     * Open Gmail compose window with pre-filled data
     * This is a fallback method that doesn't require API authentication
     */
    static openGmailCompose(emailData: EmailData): void {
        const { to, subject, body, attachmentName, attachmentContent } = emailData;
        const isMobile = this.isMobile();

        // Create mailto URL with parameters
        const params = new URLSearchParams();
        if (to) params.append('to', to);
        if (subject) params.append('subject', subject);

        // For attachments, we'll include instructions in the body
        let emailBody = body;
        if (attachmentContent && attachmentName) {
            // Create a data URL for the attachment
            const dataUrl = `data:text/html;base64,${btoa(attachmentContent)}`;
            emailBody += `\n\n--- ATTACHMENT CONTENT ---\n`;
            emailBody += `File: ${attachmentName}\n`;
            emailBody += `Please copy and save the following content as ${attachmentName}:\n\n`;
            emailBody += attachmentContent;
        }

        if (emailBody) params.append('body', emailBody);

        const mailtoUrl = `mailto:?${params.toString()}`;

        // Open the default mail client with mobile-specific handling
        if (isMobile) {
            // On mobile, use location.href for better app integration
            try {
                window.location.href = mailtoUrl;
            } catch (error) {
                // Fallback to window.open
                window.open(mailtoUrl, '_system');
            }
        } else {
            window.open(mailtoUrl, '_blank');
        }
    }

    /**
     * Open Gmail web interface with compose window
     */
    static openGmailWeb(emailData: EmailData): void {
        const { to, subject, body } = emailData;
        const isMobile = this.isMobile();

        const params = new URLSearchParams();
        if (to) params.append('to', to);
        if (subject) params.append('su', subject);
        if (body) params.append('body', body);

        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`;

        // Open Gmail with platform-specific handling
        if (isMobile) {
            // On mobile, try to open in Gmail app first, then fallback to web
            try {
                const gmailAppUrl = `googlegmail://co?to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject || '')}&body=${encodeURIComponent(body || '')}`;
                window.location.href = gmailAppUrl;

                // Fallback to web version after a short delay
                setTimeout(() => {
                    window.open(gmailUrl, '_system');
                }, 2000);
            } catch (error) {
                window.open(gmailUrl, '_system');
            }
        } else {
            window.open(gmailUrl, '_blank');
        }
    }

    /**
 * Download attachments as files and open email compose
 */
    static downloadAndCompose(emailData: EmailData): void {
        const { attachmentName, attachmentContent, additionalAttachments } = emailData;

        const downloadedFiles: string[] = [];

        // Download primary attachment if exists
        if (attachmentContent && attachmentName) {
            const blob = new Blob([attachmentContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = attachmentName;
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
            downloadedFiles.push(attachmentName);
        }

        // Download additional attachments
        if (additionalAttachments && additionalAttachments.length > 0) {
            additionalAttachments.forEach((attachment, index) => {
                setTimeout(() => {
                    const blob = new Blob([attachment.content], { type: attachment.type });
                    const url = URL.createObjectURL(blob);

                    const link = document.createElement('a');
                    link.href = url;
                    link.download = attachment.name;
                    link.style.display = 'none';

                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    URL.revokeObjectURL(url);
                    downloadedFiles.push(attachment.name);
                }, index * 200); // Stagger downloads slightly
            });
        }

        // Show message to user and open email compose
        setTimeout(() => {
            const fileList = downloadedFiles.length > 0
                ? downloadedFiles.join(', ')
                : 'the file';

            alert(`Files downloaded: ${fileList}. Please attach them manually to your email.`);

            // Open email compose without attachment content in body
            this.openGmailWeb({
                ...emailData,
                body: emailData.body + `\n\n(Please attach the downloaded files: ${fileList})`
            });
        }, additionalAttachments ? additionalAttachments.length * 200 + 500 : 500);
    }

    /**
     * Try multiple fallback approaches
     */
    static sendEmailFallback(emailData: EmailData): void {
        // First try to open Gmail web interface
        try {
            this.downloadAndCompose(emailData);
        } catch (error) {
            console.warn("Failed to open Gmail web interface, trying mailto...", error);

            // Fallback to mailto
            try {
                this.openGmailCompose(emailData);
            } catch (mailtoError) {
                console.error("All email methods failed", mailtoError);

                // Final fallback - show instructions to user
                const message = `
Please send an email manually with the following details:

To: ${emailData.to}
Subject: ${emailData.subject}

Body:
${emailData.body}

${emailData.attachmentName ? `Attachment: ${emailData.attachmentName}` : ''}
        `;

                alert(message);

                // Copy to clipboard if possible
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(message).then(() => {
                        console.log("Email details copied to clipboard");
                    }).catch(err => {
                        console.warn("Failed to copy to clipboard", err);
                    });
                }
            }
        }
    }
}

export default AlternativeGmailService;
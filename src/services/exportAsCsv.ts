import { isPlatform } from "@ionic/react";
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface CSVExportOptions {
    filename?: string;
    delimiter?: string;
    includeHeaders?: boolean;
    returnBlob?: boolean;
    onProgress?: (message: string) => void;
}

/**
 * Export CSV content to file or return as blob
 */
export async function exportCSV(
    csvContent: string,
    options: CSVExportOptions = {}
): Promise<Blob | void> {
    const {
        filename = "spreadsheet_data",
        delimiter = ",",
        includeHeaders = true,
        returnBlob = false,
        onProgress,
    } = options;

    try {
        onProgress?.("Preparing CSV content...");

        // Clean and format CSV content
        let formattedContent = csvContent;

        // Ensure proper line endings
        formattedContent = formattedContent
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n");

        // Add BOM for Excel compatibility
        const BOM = "\uFEFF";
        const csvWithBOM = BOM + formattedContent;

        onProgress?.("Creating CSV file...");

        // Create blob
        const blob = new Blob([csvWithBOM], {
            type: "text/csv;charset=utf-8;",
        });

        if (returnBlob) {
            onProgress?.("CSV generated successfully!");
            return blob;
        }

        // Generate filename with current date
        const currentDate = new Date().toISOString().split('T')[0];
        const finalFilename = `${filename}_${currentDate}`;

        if (isPlatform('hybrid')) {
            // Mobile device - use Capacitor Filesystem and Share
            onProgress?.("Preparing CSV for mobile sharing...");

            // Convert blob to base64 for mobile storage
            const reader = new FileReader();
            const base64Data = await new Promise<string>((resolve, reject) => {
                reader.onload = () => {
                    const result = reader.result as string;
                    resolve(result.split(',')[1]); // Remove data:text/csv;base64, prefix
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            // Write file to device storage
            const result = await Filesystem.writeFile({
                path: `${finalFilename}.csv`,
                data: base64Data,
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });

            onProgress?.("Sharing CSV file...");

            // Share the file
            await Share.share({
                title: 'Export CSV',
                text: `${finalFilename}.csv`,
                url: result.uri,
                dialogTitle: 'Share CSV File'
            });
        } else {
            // Web browser - use traditional download
            onProgress?.("Downloading CSV file...");

            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);

            link.setAttribute("href", url);
            link.setAttribute("download", `${finalFilename}.csv`);
            link.style.visibility = "hidden";

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up
            URL.revokeObjectURL(url);
        }

        onProgress?.("CSV exported successfully!");
    } catch (error) {
        console.error("Error exporting CSV:", error);
        throw new Error("Failed to export CSV. Please try again.");
    }
}

/**
 * Convert array data to CSV format
 */
export function convertToCSV(data: any[][]): string {
    if (!data || data.length === 0) {
        return "";
    }

    return data
        .map((row) => {
            return row
                .map((cell) => {
                    // Handle null/undefined values
                    if (cell === null || cell === undefined) {
                        return "";
                    }

                    // Convert to string
                    const value = String(cell);

                    // Escape quotes and wrap in quotes if necessary
                    if (
                        value.includes(",") ||
                        value.includes('"') ||
                        value.includes("\n")
                    ) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }

                    return value;
                })
                .join(",");
        })
        .join("\n");
}

/**
 * Parse CSV content from SocialCalc format
 */
export function parseSocialCalcCSV(csvContent: string): string {
    if (!csvContent) {
        return "";
    }

    try {
        // Clean up SocialCalc CSV output
        const lines = csvContent.split("\n");
        const cleanedLines = lines
            .filter((line) => line.trim() !== "") // Remove empty lines
            .map((line) => line.trim()); // Trim whitespace

        return cleanedLines.join("\n");
    } catch (error) {
        console.error("Error parsing SocialCalc CSV:", error);
        return csvContent;
    }
}

/**
 * Clean CSV content for better formatting
 */
export function cleanCSVContent(csvContent: string): string {
    if (!csvContent) {
        return "";
    }

    try {
        // Split into lines and process each line
        const lines = csvContent.split(/\r?\n/);
        const cleanedLines: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Preserve all lines except completely empty ones at the end
            if (line.trim() !== "" || i < lines.length - 1) {
                // Keep the line as-is to preserve empty cells (represented by commas)
                cleanedLines.push(line);
            }
        }

        // Remove only trailing empty lines
        while (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1].trim() === "") {
            cleanedLines.pop();
        }

        return cleanedLines.join("\n");
    } catch (error) {
        console.error("Error cleaning CSV content:", error);
        return csvContent;
    }
}

/**
 * Validate CSV content before export
 */
export function validateCSVContent(csvContent: string): { isValid: boolean; error?: string } {
    if (!csvContent || csvContent.trim() === "") {
        return {
            isValid: false,
            error: "CSV content is empty"
        };
    }

    try {
        const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== "");

        if (lines.length === 0) {
            return {
                isValid: false,
                error: "No valid data rows found"
            };
        }

        // Check if at least one line has data
        const hasData = lines.some(line => {
            const trimmed = line.trim();
            return trimmed !== "" && trimmed !== ",";
        });

        if (!hasData) {
            return {
                isValid: false,
                error: "No valid data found in CSV content"
            };
        }

        return { isValid: true };
    } catch (error) {
        return {
            isValid: false,
            error: `CSV validation error: ${(error as Error).message}`
        };
    }
}

/**
 * Get CSV export preview (first few lines)
 */
export function getCSVPreview(csvContent: string, maxLines: number = 5): string {
    if (!csvContent) {
        return "No data available";
    }

    try {
        const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== "");
        const previewLines = lines.slice(0, maxLines);

        if (lines.length > maxLines) {
            previewLines.push(`... and ${lines.length - maxLines} more rows`);
        }

        return previewLines.join("\n");
    } catch (error) {
        return "Error generating preview";
    }
} 
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { isPlatform } from "@ionic/react";
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface ExportAllSheetsOptions {
    filename?: string;
    format?: "a4" | "letter" | "legal";
    orientation?: "portrait" | "landscape";
    margin?: number;
    quality?: number;
    onProgress?: (message: string) => void;
    returnBlob?: boolean;
}

export interface SheetData {
    id: string;
    name: string;
    htmlContent?: string;
    element?: HTMLElement;
}

export const exportAllSheetsAsPDF = async (
    sheetsData: SheetData[],
    options: ExportAllSheetsOptions = {}
): Promise<void | Blob> => {
    const {
        filename = "workbook",
        format = "a4",
        orientation = "landscape",
        margin = 15,
        quality = 1.5,
        onProgress,
        returnBlob = false,
    } = options;

    try {
        if (!sheetsData || sheetsData.length === 0) {
            throw new Error("No sheets data provided");
        }

        onProgress?.(`Starting export of ${sheetsData.length} sheets...`);

        // Create PDF document
        const pdf = new jsPDF({
            orientation: orientation,
            unit: "mm",
            format: format,
        });

        const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
        const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;

        // Remove the default first page
        pdf.deletePage(1);

        for (let i = 0; i < sheetsData.length; i++) {
            const sheet = sheetsData[i];

            onProgress?.(
                `Processing sheet ${i + 1}/${sheetsData.length}: ${sheet.name}...`
            );

            // Create temporary container for each sheet
            const tempContainer = document.createElement("div");

            // Use provided HTML content or extract from element
            if (sheet.htmlContent) {
                tempContainer.innerHTML = sheet.htmlContent;
            } else if (sheet.element) {
                tempContainer.appendChild(sheet.element.cloneNode(true));
            } else {
                console.warn(`No content available for sheet ${sheet.name}`);
                continue;
            }

            tempContainer.style.position = "absolute";
            tempContainer.style.left = "-9999px";
            tempContainer.style.top = "-9999px";
            tempContainer.style.width = "210mm"; // A4 portrait width
            tempContainer.style.padding = "20px";
            tempContainer.style.backgroundColor = "white";
            tempContainer.style.color = "#000";
            tempContainer.style.fontFamily = "Arial, sans-serif";
            tempContainer.style.fontSize = "12px";
            tempContainer.style.lineHeight = "1.4";

            // Add sheet title header
            const titleElement = document.createElement("h2");
            titleElement.textContent = sheet.name;
            titleElement.style.marginBottom = "20px";
            titleElement.style.color = "#333";
            titleElement.style.borderBottom = "2px solid #333";
            titleElement.style.paddingBottom = "10px";
            titleElement.style.fontSize = "16px";
            titleElement.style.fontWeight = "bold";
            tempContainer.insertBefore(titleElement, tempContainer.firstChild);

            document.body.appendChild(tempContainer);

            try {
                onProgress?.(`Rendering sheet ${i + 1} to canvas...`);

                // Convert HTML to canvas with higher quality
                const canvas = await html2canvas(tempContainer, {
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: "#ffffff",
                    width: tempContainer.scrollWidth,
                    height: tempContainer.scrollHeight,
                    scale: quality,
                    logging: false,
                    removeContainer: false,
                } as any);

                // Calculate dimensions for PDF
                const imgWidth = pageWidth;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                // Add new page for each sheet
                pdf.addPage();

                onProgress?.(`Adding sheet ${i + 1} to PDF...`);

                // If content fits on one page
                if (imgHeight <= pageHeight) {
                    pdf.addImage(
                        canvas.toDataURL("image/png", 0.95),
                        "PNG",
                        margin,
                        margin,
                        imgWidth,
                        imgHeight,
                        undefined,
                        "FAST"
                    );
                } else {
                    // Content spans multiple pages
                    let heightLeft = imgHeight;
                    let position = margin;

                    // Add first part
                    pdf.addImage(
                        canvas.toDataURL("image/png", 0.95),
                        "PNG",
                        margin,
                        position,
                        imgWidth,
                        imgHeight,
                        undefined,
                        "FAST"
                    );

                    heightLeft -= pageHeight;

                    // Add continuation pages for this sheet if needed
                    while (heightLeft >= 0) {
                        position = heightLeft - imgHeight + margin;
                        pdf.addPage();
                        pdf.addImage(
                            canvas.toDataURL("image/png", 0.95),
                            "PNG",
                            margin,
                            position,
                            imgWidth,
                            imgHeight,
                            undefined,
                            "FAST"
                        );
                        heightLeft -= pageHeight;
                    }
                }
            } finally {
                // Always remove the temporary container
                document.body.removeChild(tempContainer);
            }
        }

        onProgress?.("Finalizing PDF...");

        // Generate filename with current date
        const currentDate = new Date().toISOString().split('T')[0];
        const finalFilename = `${filename}_${currentDate}`;

        if (returnBlob) {
            onProgress?.("PDF generated successfully!");
            return pdf.output("blob");
        } else {
            // Handle mobile vs web differently
            if (isPlatform('hybrid')) {
                onProgress?.("Preparing file for mobile sharing...");
                // Mobile - save and share
                const pdfBase64 = pdf.output('datauristring').split(',')[1];
                const result = await Filesystem.writeFile({
                    path: `${finalFilename}.pdf`,
                    data: pdfBase64,
                    directory: Directory.Documents,
                    encoding: Encoding.UTF8
                });

                await Share.share({
                    title: 'Export Workbook PDF',
                    text: `${finalFilename}.pdf`,
                    url: result.uri,
                    dialogTitle: 'Share Workbook PDF'
                });
            } else {
                // Web - direct download
                pdf.save(`${finalFilename}.pdf`);
            }

            onProgress?.(`PDF with ${sheetsData.length} sheets saved successfully!`);
        }
    } catch (error) {
        console.error("Error generating combined PDF:", error);
        throw new Error("Failed to generate combined PDF. Please try again.");
    }
};

// Utility function for single sheet export using the multi-sheet logic
export const exportSingleSheetAsPDF = async (
    htmlContent: string,
    options: ExportAllSheetsOptions = {}
): Promise<void | Blob> => {
    const sheetData: SheetData[] = [
        {
            id: "sheet1",
            name: "Sheet 1",
            htmlContent: htmlContent,
        },
    ];

    return exportAllSheetsAsPDF(sheetData, options);
};

// Function to export using element instead of HTML content
export const exportElementsAsPDF = async (
    sheetsData: Array<{ id: string; name: string; element: HTMLElement }>,
    options: ExportAllSheetsOptions = {}
): Promise<void | Blob> => {
    const convertedSheets: SheetData[] = sheetsData.map(sheet => ({
        id: sheet.id,
        name: sheet.name,
        element: sheet.element
    }));

    return exportAllSheetsAsPDF(convertedSheets, options);
};

// Helper function to create sheet data from HTML content
export const createSheetData = (
    id: string,
    name: string,
    htmlContent: string
): SheetData => {
    return {
        id,
        name,
        htmlContent
    };
};

// Helper function to create sheet data from element
export const createSheetDataFromElement = (
    id: string,
    name: string,
    element: HTMLElement
): SheetData => {
    return {
        id,
        name,
        element
    };
};

// Function to validate sheet data before export
export const validateSheetsData = (sheetsData: SheetData[]): { isValid: boolean; error?: string } => {
    if (!sheetsData || sheetsData.length === 0) {
        return {
            isValid: false,
            error: "No sheets data provided"
        };
    }

    for (let i = 0; i < sheetsData.length; i++) {
        const sheet = sheetsData[i];

        if (!sheet.id || !sheet.name) {
            return {
                isValid: false,
                error: `Sheet ${i + 1} is missing required id or name`
            };
        }

        if (!sheet.htmlContent && !sheet.element) {
            return {
                isValid: false,
                error: `Sheet ${sheet.name} has no content (htmlContent or element)`
            };
        }
    }

    return { isValid: true };
};

// Function to get workbook export summary
export const getWorkbookExportSummary = (sheetsData: SheetData[]): string => {
    if (!sheetsData || sheetsData.length === 0) {
        return "No sheets to export";
    }

    const sheetNames = sheetsData.map(sheet => sheet.name).join(", ");
    return `${sheetsData.length} sheet(s): ${sheetNames}`;
}; 
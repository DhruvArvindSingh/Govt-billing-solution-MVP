import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { isPlatform } from "@ionic/react";
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface ExportOptions {
    filename?: string;
    format?: "a4" | "letter" | "legal";
    orientation?: "portrait" | "landscape";
    margin?: number;
    quality?: number;
    onProgress?: (message: string) => void;
    returnBlob?: boolean;
}

export const exportHTMLAsPDF = async (
    htmlContent: string,
    options: ExportOptions = {}
): Promise<void | Blob> => {
    const {
        filename = "invoice",
        format = "a4",
        orientation = "portrait",
        margin = 10,
        quality = 2,
        onProgress,
        returnBlob = false,
    } = options;

    try {
        onProgress?.("Preparing HTML content...");

        // Create a temporary container for the HTML content
        const tempContainer = document.createElement("div");
        tempContainer.innerHTML = htmlContent;
        tempContainer.style.position = "absolute";
        tempContainer.style.left = "-9999px";
        tempContainer.style.top = "-9999px";
        tempContainer.style.width = "210mm"; // A4 width
        tempContainer.style.padding = "20px";
        tempContainer.style.backgroundColor = "white";
        tempContainer.style.color = "#000";
        tempContainer.style.fontFamily = "Arial, sans-serif";
        tempContainer.style.fontSize = "12px";
        tempContainer.style.lineHeight = "1.4";

        document.body.appendChild(tempContainer);

        onProgress?.("Rendering content to canvas...");

        // Convert HTML to canvas with high quality
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

        // Remove temporary container
        document.body.removeChild(tempContainer);

        onProgress?.("Creating PDF document...");

        // Create PDF
        const pdf = new jsPDF({
            orientation: orientation,
            unit: "mm",
            format: format,
        });

        // Calculate dimensions
        const imgWidth = pdf.internal.pageSize.getWidth() - margin * 2;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;

        let heightLeft = imgHeight;
        let position = margin;

        onProgress?.("Adding content to PDF...");

        // Add first page
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

        // Add additional pages if content overflows
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
                    title: 'Export PDF',
                    text: `${finalFilename}.pdf`,
                    url: result.uri,
                    dialogTitle: 'Share PDF File'
                });
            } else {
                // Web - direct download
                pdf.save(`${finalFilename}.pdf`);
            }

            onProgress?.("PDF generated successfully!");
        }
    } catch (error) {
        console.error("Error generating PDF:", error);
        throw new Error("Failed to generate PDF. Please try again.");
    }
};

// Export spreadsheet element directly (for current implementation compatibility)
export const exportSpreadsheetAsPDF = async (
    spreadsheetElement: HTMLElement,
    options: ExportOptions = {}
): Promise<void | Blob> => {
    const {
        filename = "spreadsheet",
        format = "a4",
        orientation = "portrait",
        margin = 8,
        quality = 2,
        onProgress,
        returnBlob = false,
    } = options;

    try {
        onProgress?.("Preparing spreadsheet for export...");

        // Ensure the spreadsheet is fully rendered and visible
        await new Promise(resolve => setTimeout(resolve, 500));

        onProgress?.("Rendering spreadsheet to canvas...");

        // Create PDF directly from the spreadsheet element
        const canvas = await html2canvas(spreadsheetElement, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            scale: quality,
            logging: false,
            width: spreadsheetElement.scrollWidth,
            height: spreadsheetElement.scrollHeight,
            foreignObjectRendering: false,
            imageTimeout: 0,
            removeContainer: false
        } as any);

        onProgress?.("Generating PDF document...");

        // Create PDF with specified orientation
        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: format
        });

        // Calculate dimensions
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const availableWidth = pdfWidth - (margin * 2);
        const availableHeight = pdfHeight - (margin * 2);

        // Scale the content to fit the page
        const scaleFactor = Math.min(
            availableWidth / (canvas.width * 0.75),
            availableHeight / (canvas.height * 0.75)
        );

        let imgWidth = canvas.width * scaleFactor;
        let imgHeight = canvas.height * scaleFactor;

        // Ensure minimum size for readability
        const minWidth = availableWidth * 0.8;
        const minHeight = availableHeight * 0.6;

        if (imgWidth < minWidth) {
            const widthScale = minWidth / imgWidth;
            imgWidth = minWidth;
            imgHeight = imgHeight * widthScale;
        }

        if (imgHeight < minHeight && imgHeight <= availableHeight) {
            const heightScale = minHeight / imgHeight;
            imgHeight = minHeight;
            imgWidth = imgWidth * heightScale;
        }

        // Ensure we don't exceed page boundaries
        if (imgWidth > availableWidth) {
            const widthScale = availableWidth / imgWidth;
            imgWidth = availableWidth;
            imgHeight = imgHeight * widthScale;
        }

        // Center the image on the page
        const xPos = (pdfWidth - imgWidth) / 2;
        const yPos = (pdfHeight - imgHeight) / 2;

        onProgress?.("Adding content to PDF...");

        // Check if content fits on one page
        if (imgHeight <= availableHeight) {
            // Single page - perfectly centered
            pdf.addImage(canvas.toDataURL('image/png', 0.95), 'PNG', xPos, yPos, imgWidth, imgHeight);
        } else {
            // Multi-page handling for tall content
            const pageScale = availableHeight / imgHeight;
            const scaledWidth = imgWidth * pageScale;
            const scaledHeight = availableHeight;
            const scaledXPos = (pdfWidth - scaledWidth) / 2;

            let remainingHeight = canvas.height;
            let sourceY = 0;
            let pageCount = 0;
            const pixelsPerPage = canvas.height * pageScale;

            while (remainingHeight > 0) {
                if (pageCount > 0) {
                    pdf.addPage();
                }

                const currentPagePixels = Math.min(remainingHeight, pixelsPerPage);
                const currentPageHeight = (currentPagePixels / canvas.height) * scaledHeight;

                // Create a temporary canvas for this page section
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = canvas.width;
                tempCanvas.height = currentPagePixels;

                if (tempCtx) {
                    tempCtx.drawImage(canvas, 0, sourceY, canvas.width, currentPagePixels, 0, 0, canvas.width, currentPagePixels);
                    const tempImgData = tempCanvas.toDataURL('image/png', 0.95);

                    const pageYPos = margin + ((availableHeight - currentPageHeight) / 2);
                    pdf.addImage(tempImgData, 'PNG', scaledXPos, pageYPos, scaledWidth, currentPageHeight);
                }

                sourceY += currentPagePixels;
                remainingHeight -= currentPagePixels;
                pageCount++;
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
                const pdfBase64 = pdf.output('datauristring').split(',')[1];
                const result = await Filesystem.writeFile({
                    path: `${finalFilename}.pdf`,
                    data: pdfBase64,
                    directory: Directory.Documents,
                    encoding: Encoding.UTF8
                });

                await Share.share({
                    title: 'Export PDF',
                    text: `${finalFilename}.pdf`,
                    url: result.uri,
                    dialogTitle: 'Share PDF File'
                });
            } else {
                pdf.save(`${finalFilename}.pdf`);
            }

            onProgress?.("PDF generated successfully!");
        }
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw new Error('Failed to generate PDF. Please try again.');
    }
}; 
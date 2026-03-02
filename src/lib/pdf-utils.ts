import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ExportPDFOptions {
  filename: string;
  element: HTMLElement;
  /** Fixed render width for consistent output (default: 600) */
  renderWidth?: number;
  /** Margin in mm (default: 10) */
  margin?: number;
}

/**
 * Exports an HTML element to a multi-page A4 PDF.
 * Clones the element offscreen at a fixed width, renders via html2canvas,
 * then slices the canvas into A4-sized pages with margins.
 */
export async function exportElementToPDF({
  filename,
  element,
  renderWidth = 600,
  margin = 10,
}: ExportPDFOptions): Promise<void> {
  // Clone element offscreen for consistent rendering
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.position = "absolute";
  clone.style.left = "-9999px";
  clone.style.top = "0";
  clone.style.width = `${renderWidth}px`;
  clone.style.maxWidth = `${renderWidth}px`;
  clone.style.overflow = "visible";
  clone.style.height = "auto";
  document.body.appendChild(clone);

  try {
    // Wait for images to load
    const images = clone.querySelectorAll("img");
    await Promise.all(
      Array.from(images).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) resolve();
            else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          })
      )
    );

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: renderWidth,
      windowWidth: renderWidth,
    });

    document.body.removeChild(clone);

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;

    // Scale factor: how many mm per canvas pixel
    const scale = contentWidth / canvas.width;
    const totalScaledHeight = canvas.height * scale;

    if (totalScaledHeight <= contentHeight) {
      // Fits on one page
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        margin,
        margin,
        contentWidth,
        totalScaledHeight
      );
    } else {
      // Multi-page: slice the canvas into page-height chunks
      const sliceHeightPx = contentHeight / scale; // how many canvas pixels fit per page
      let yOffset = 0;
      let pageIndex = 0;

      while (yOffset < canvas.height) {
        const currentSliceHeight = Math.min(sliceHeightPx, canvas.height - yOffset);

        // Create a temporary canvas for this page slice
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = currentSliceHeight;
        const ctx = pageCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(
            canvas,
            0,
            yOffset,
            canvas.width,
            currentSliceHeight,
            0,
            0,
            canvas.width,
            currentSliceHeight
          );
        }

        if (pageIndex > 0) {
          pdf.addPage();
        }

        const scaledSliceHeight = currentSliceHeight * scale;
        pdf.addImage(
          pageCanvas.toDataURL("image/png"),
          "PNG",
          margin,
          margin,
          contentWidth,
          scaledSliceHeight
        );

        yOffset += currentSliceHeight;
        pageIndex++;
      }
    }

    pdf.save(filename);
  } catch (error) {
    // Clean up clone if still in DOM
    if (clone.parentNode) {
      document.body.removeChild(clone);
    }
    throw error;
  }
}

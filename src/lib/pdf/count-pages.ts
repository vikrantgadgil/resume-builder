let workerConfigured = false;

export async function countPdfPages(blob: Blob): Promise<number> {
  const pdfjsLib = await import("pdfjs-dist");

  if (!workerConfigured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    workerConfigured = true;
  }

  const arrayBuffer = await blob.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const doc = await loadingTask.promise;
  return doc.numPages;
}

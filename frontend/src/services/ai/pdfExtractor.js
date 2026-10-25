import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const pdfExtractor = {
  async extract(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();

      const pdf = await getDocument({
        data: arrayBuffer,
      }).promise;

      let extractedText = "";

      for (let page = 1; page <= pdf.numPages; page++) {
        const pdfPage = await pdf.getPage(page);

        const textContent = await pdfPage.getTextContent();

        extractedText +=
          textContent.items.map((item) => item.str).join(" ") + "\n";
      }

      return extractedText.trim();
    } catch (error) {
      console.error("PDF Extraction Error:", error);
      return "";
    }
  },
};

export default pdfExtractor;
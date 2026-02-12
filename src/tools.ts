import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { cutPdfPages } from "./pdf-service.js";

// Wir wrappen unsere Core-Logik in ein LangChain Tool
export const pdfCutterTool = tool(
  async ({ sourcePath, outputDir, startPage, endPage }) => {
    try {
      const resultPath = await cutPdfPages(sourcePath, outputDir, startPage, endPage);
      return `Successfully cut PDF. New file saved at: ${resultPath}`;
    } catch (error: any) {
      return `Error cutting PDF: ${error.message}`;
    }
  },
  {
    name: "cut_pdf",
    description: "Cuts a range of pages from a PDF and saves them as a new file.",
    schema: z.object({
      sourcePath: z.string().describe("Absolute path to the source PDF file"),
      outputDir: z.string().describe("Directory where the new PDF should be saved"),
      startPage: z.number().int().describe("Start page number (1-based)"),
      endPage: z.number().int().describe("End page number (1-based)"),
    }),
  }
);
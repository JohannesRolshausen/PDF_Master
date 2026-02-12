import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { runAgentWorkflow } from "./agent.js";

const server = new McpServer({
  name: "agentic-pdf-cutter",
  version: "2.0.1", // Version hoch, um sicherzugehen, dass Cursor das Update merkt
});

// Definieren des Schemas VOR dem Aufruf, das hilft bei der Typsicherheit
const pdfToolInputSchema = z.object({
  pdfPath: z.string().describe("The absolute file path to the PDF (e.g. C:\\Users\\... or /home/...)"),
  instruction: z.string().describe("What to do with the PDF (e.g. 'Extract page 1', 'Cut pages 3-5')"),
});

server.registerTool(
  "process-pdf-smartly",
  {
    description: "Intelligent PDF processing tool. Use this to cut, extract, or modify PDFs based on instructions.",
    inputSchema: pdfToolInputSchema,
  },
  async (args) => {
    // Zod parst die Argumente sicher für uns
    const { pdfPath, instruction } = pdfToolInputSchema.parse(args);

    try {
      // Log an stderr, damit wir sehen, was ankommt
      console.error(`[MCP Log] Processing: ${instruction} on ${pdfPath}`);
      
      const agentResponse = await runAgentWorkflow(pdfPath, instruction);
      
      return {
        content: [
          {
            type: "text",
            text: agentResponse,
          },
        ],
      };
    } catch (error: any) {
      console.error(`[MCP Error]`, error);
      return {
        content: [
          {
            type: "text",
            text: `Error processing PDF: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Agentic MCP Server running...");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
import * as dotenv from "dotenv";
dotenv.config();

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { pdfCutterTool } from "./tools.js";
import { HumanMessage } from "@langchain/core/messages";

// 1. Das Model Setup (Gemini Pro)
const tools = [pdfCutterTool];
const toolNode = new ToolNode(tools); // Vorgefertigter Node, der Tools ausführt

const model = new ChatGoogleGenerativeAI({
  model: "gemini-flash-lite-latest",
  temperature: 0,
}).bindTools(tools);

// 2. Definition der Logik für den Agent-Node
// Der Agent bekommt den State (Nachrichten), ruft das Model auf und gibt neue Nachrichten zurück
async function callModel(state: typeof MessagesAnnotation.State) {
  const { messages } = state;
  const result = await model.invoke(messages);
  return { messages: [result] };
}

// 3. Entscheidungslogik (Conditional Edge)
// Soll das Tool ausgeführt werden oder antworten wir dem User?
function shouldContinue(state: typeof MessagesAnnotation.State) {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];

  // Wenn das LLM einen Tool-Call generiert hat, gehen wir zu "tools"
  if (
    "tool_calls" in lastMessage && 
    Array.isArray(lastMessage.tool_calls) && 
    lastMessage.tool_calls.length > 0
  ) {
    return "tools";
  }
  
  // Sonst sind wir fertig
  return "__end__";
}

// 4. Den Graphen zusammenbauen
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent") // Start -> Agent
  .addConditionalEdges("agent", shouldContinue) // Agent -> Entscheidung
  .addEdge("tools", "agent"); // Tools -> Zurück zum Agent (Ergebnis interpretieren)

// Kompilieren des Graphen zu einer ausführbaren App
export const app = workflow.compile();


export async function runAgentWorkflow(pdfPath: string, instruction: string): Promise<string> {
  // 1. Inputs für den Graphen vorbereiten
  
  console.log(`🤖 Agent startet...`);
  console.log(`📂 Zieldatei: ${pdfPath}`);
  console.log(`📝 Aufgabe: ${instruction}\n`);

  const inputs = {
    messages: [
      new HumanMessage(
        `Hier ist der Dateipfad: "${pdfPath}". ` +
        `Aufgabe: ${instruction}. ` +
        `Output-Verzeichnis ist dasselbe wie Quellverzeichnis. ` +
        `Antworte am Ende NUR mit dem Pfad zur neuen Datei oder einer Fehlermeldung.`
      ),
    ],
  };
  // 2. Graphen ausführen
  // Wir nutzen 'invoke' statt 'stream', da der MCP Server auf das finale Ergebnis wartet
  const result = await app.invoke(inputs);
  
  // 3. Die letzte Nachricht (die Antwort des Agenten) extrahieren
  const lastMessage = result.messages[result.messages.length - 1];
  
  return lastMessage.content as string;
}
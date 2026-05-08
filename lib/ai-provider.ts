import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AIProvider {
  generateAnalysis(prompt: string, systemPrompt: string): Promise<string>;
}

class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  constructor(apiKey: string) {
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");
    this.client = new GoogleGenerativeAI(apiKey);
  }
  async generateAnalysis(prompt: string, systemPrompt: string): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
      generationConfig: { responseMimeType: "application/json" },
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}

// ClaudeProvider is a stub. To enable: install @anthropic-ai/sdk and uncomment.
class ClaudeProvider implements AIProvider {
  constructor(_apiKey: string) {
    throw new Error("ClaudeProvider not yet wired. Install @anthropic-ai/sdk and implement.");
  }
  async generateAnalysis(_prompt: string, _systemPrompt: string): Promise<string> {
    throw new Error("Not implemented");
  }
}

function buildProvider(): AIProvider {
  if (process.env.AI_PROVIDER === "claude") {
    return new ClaudeProvider(process.env.ANTHROPIC_API_KEY || "");
  }
  return new GeminiProvider(process.env.GEMINI_API_KEY || "");
}

// Lazy singleton — env may not be loaded at import time in some contexts.
let _provider: AIProvider | null = null;
export const aiProvider: AIProvider = {
  generateAnalysis(prompt, systemPrompt) {
    if (!_provider) _provider = buildProvider();
    return _provider.generateAnalysis(prompt, systemPrompt);
  },
};

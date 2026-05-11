import Groq from "groq-sdk";

export interface AIProvider {
  generateAnalysis(prompt: string, systemPrompt: string): Promise<string>;
}

class GroqProvider implements AIProvider {
  private client: Groq;
  constructor(apiKey: string) {
    if (!apiKey) throw new Error("GROQ_API_KEY not set");
    this.client = new Groq({ apiKey });
  }
  async generateAnalysis(prompt: string, systemPrompt: string): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });
    return completion.choices[0]?.message?.content ?? "";
  }
}

let _provider: AIProvider | null = null;
export const aiProvider: AIProvider = {
  generateAnalysis(prompt, systemPrompt) {
    if (!_provider) _provider = new GroqProvider(process.env.GROQ_API_KEY || "");
    return _provider.generateAnalysis(prompt, systemPrompt);
  },
};

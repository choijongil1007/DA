
import { GoogleGenAI } from "@google/genai";

export async function callGemini(prompt: string, isJson: boolean = false) {
  // Always initialize GoogleGenAI directly with process.env.API_KEY in the function scope
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: isJson ? "application/json" : "text/plain",
    }
  });

  // Access the text property directly on GenerateContentResponse
  const text = response.text || "";
  if (isJson) {
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse AI JSON response", text);
      throw new Error("AI 응답 형식이 올바르지 않습니다.");
    }
  }
  return text;
}

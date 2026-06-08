"use server";

export interface Lesson {
  id: string;
  number: number;
  title: string;
}

export type VocabularyLevel =
  | "BASIQUE 基本"
  | "POUR ALLER PLUS LOIN 進階"
  | "EXPERT 高手";

export interface VocabularyItem {
  id: string;
  lessonId: string;
  word: string;
  type: string;
  level: VocabularyLevel;
  translation: string;
  example: string;
  exampleZh: string;
}

export interface WordSuggestion {
  type: string;
  translation: string;
  example: string;
  exampleZh: string;
}

/**
 * Get AI-generated suggestions for a French word using GitHub Models (Copilot) API
 * Suggests: word type (part of speech), Chinese translation, and example sentence
 * Requires GITHUB_TOKEN environment variable with access to GitHub Models
 *
 * Uses the GitHub Copilot Models API endpoint: https://models.inference.ai.azure.com
 * Supports models: gpt-4o, gpt-4-turbo, claude-3.5-sonnet, llama-2-7b, etc.
 */
export async function getWordSuggestions(
  frenchWord: string
): Promise<WordSuggestion> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.warn(
      "GITHUB_TOKEN not configured. AI suggestions unavailable. Please set GITHUB_TOKEN in .env.local"
    );
    return {
      type: "",
      translation: "",
      example: "",
      exampleZh: "",
    };
  }

  try {
    const prompt = `You are a French language expert. For the French word "${frenchWord}", provide:
1. Part of speech in French only (e.g. nom, verbe, adjectif, adverbe, pronom, expression, article, préposition, conjonction, interjection)
2. Chinese translation in traditional Chinese
3. Example French sentence using this word naturally
4. Chinese translation (traditional Chinese) of the French example sentence

Format your response as JSON only, with no markdown or extra text:
{
  "type": "type_en_francais",
  "translation": "Traduction chinoise traditionnelle",
  "example": "Example sentence in French",
  "exampleZh": "Traduction chinoise traditionnelle de la phrase d'exemple"
}`;

    // Call GitHub Models API via REST endpoint
    // Documentation: https://docs.github.com/en/copilot/how-tos/copilot-sdk/getting-started
    const response = await fetch("https://models.inference.ai.azure.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: "gpt-4o", // or "claude-3.5-sonnet", "llama-2-7b", etc.
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 250,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`GitHub Models API error (${response.status}):`, errorData);
      return {
        type: "",
        translation: "",
        example: "",
        exampleZh: "",
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON response
    const parsed = JSON.parse(content);

    return {
      type: parsed.type?.toLowerCase() || "",
      translation: parsed.translation || "",
      example: parsed.example || "",
      exampleZh: parsed.exampleZh || "",
    };
  } catch (error) {
    console.error("Error fetching word suggestions from GitHub Models:", error);
    return {
      type: "",
      translation: "",
      example: "",
      exampleZh: "",
    };
  }
}

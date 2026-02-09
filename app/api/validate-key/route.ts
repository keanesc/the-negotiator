// ============================================================
// Validate API Key Route — validates Gemini API keys
// ============================================================

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

// Check if server has an API key configured
export async function GET() {
  const hasServerKey = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  return Response.json({ hasServerKey });
}

// Validate a provided API key
export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey || typeof apiKey !== "string") {
      return Response.json({ error: "API key is required" }, { status: 400 });
    }

    // Test the API key with a minimal request
    try {
      const google = createGoogleGenerativeAI({
        apiKey: apiKey.trim(),
      });

      await generateText({
        model: google("gemini-2.0-flash-exp"),
        prompt: "Say 'ok'",
        maxOutputTokens: 5,
      });

      return Response.json({ valid: true });
    } catch (error: unknown) {
      console.error("[Validate API Key Error]", error);

      // Check for specific error types
      if (error && typeof error === "object" && "message" in error) {
        const message = String(error.message).toLowerCase();

        if (message.includes("api key") || message.includes("auth")) {
          return Response.json(
            { error: "Invalid API key. Please check your key and try again." },
            { status: 401 },
          );
        }

        if (message.includes("quota") || message.includes("rate limit")) {
          return Response.json(
            {
              error: "API quota exceeded. Please check your Gemini API limits.",
            },
            { status: 429 },
          );
        }
      }

      return Response.json(
        { error: "Failed to validate API key. Please try again." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[Validate API Key Parsing Error]", error);
    return Response.json({ error: "Invalid request format" }, { status: 400 });
  }
}

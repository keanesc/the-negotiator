// ============================================================
// Negotiate API Route — receives audio + biometrics, streams Jax's response
// ============================================================

import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { JAX_SYSTEM_PROMPT, formatBiometrics } from "@/lib/game/prompts";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const audioFile = formData.get("audio") as File | null;
    const biometricsRaw = formData.get("biometrics") as string | null;
    const historyRaw = formData.get("history") as string | null;

    if (!audioFile) {
      return new Response("Missing audio file", { status: 400 });
    }

    // Parse biometrics
    const biometrics = biometricsRaw
      ? JSON.parse(biometricsRaw)
      : { yelling: 0, whispering: 0, stammering: 0, hesitating: 0 };

    // Parse conversation history
    const history: { role: string; text: string }[] = historyRaw
      ? JSON.parse(historyRaw)
      : [];

    // Convert audio file to buffer
    const audioBuffer = await audioFile.arrayBuffer();
    const audioData = new Uint8Array(audioBuffer);

    // Build messages array with conversation history
    const messages: Parameters<typeof streamText>[0]["messages"] = [];

    // Add conversation history as alternating user/assistant messages
    for (const entry of history) {
      messages.push({
        role: entry.role === "negotiator" ? "user" : "assistant",
        content: entry.text,
      });
    }

    // Add current turn with audio + biometric annotation
    const biometricAnnotation = formatBiometrics(biometrics);

    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: `Listen to this audio from the negotiator and respond in character as JAX.\n\n${biometricAnnotation}`,
        },
        {
          type: "file",
          data: audioData,
          mediaType: "audio/wav",
        },
      ],
    });

    const result = streamText({
      model: google("gemini-3-flash-preview"),
      system: JAX_SYSTEM_PROMPT,
      messages,
      maxOutputTokens: 500,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[Negotiate API Error]", error);
    return new Response(
      JSON.stringify({ error: "Failed to process negotiation" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

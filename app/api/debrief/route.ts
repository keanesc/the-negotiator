// ============================================================
// Debrief API Route — post-game performance review
// ============================================================

import { streamText } from "ai";
import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import { DEBRIEF_PROMPT } from "@/lib/game/prompts";

export async function POST(request: Request) {
  try {
    // Get API key from header or fall back to server env var
    const clientApiKey = request.headers.get("x-api-key");
    const apiKey = clientApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "No API key configured. Please add your Gemini API key.",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const body = await request.json();
    const { conversation, biometricLog, finalState } = body;

    // Build the debrief context
    const transcript = conversation
      .map(
        (
          entry: {
            role: string;
            text: string;
            biometrics?: Record<string, number>;
          },
          i: number,
        ) =>
          `[Turn ${i + 1}] ${entry.role.toUpperCase()}: ${entry.text}${
            entry.biometrics
              ? ` [Voice: Yell=${entry.biometrics.yelling?.toFixed(2)}, Whisper=${entry.biometrics.whispering?.toFixed(2)}, Stammer=${entry.biometrics.stammering?.toFixed(2)}, Hesitate=${entry.biometrics.hesitating?.toFixed(2)}]`
              : ""
          }`,
      )
      .join("\n\n");

    const outcome =
      finalState.tension <= 15
        ? "SUSPECT SURRENDERED — Mission Success"
        : finalState.hostages <= 0
          ? "ALL HOSTAGES LOST — Mission Failure"
          : "ONGOING / INCOMPLETE";

    const debriefContext = `# MISSION DEBRIEF

## Outcome: ${outcome}

## Final State
- Tension: ${finalState.tension}/100
- Paranoia: ${finalState.paranoia}/100
- Respect: ${finalState.respect}/100
- Hostages Remaining: ${finalState.hostages}/3

## Transcript
${transcript}

## Biometric Summary
Total turns: ${biometricLog.length}
Average Yelling: ${avg(biometricLog, "yelling")}
Average Whispering: ${avg(biometricLog, "whispering")}
Average Stammering: ${avg(biometricLog, "stammering")}
Average Hesitation: ${avg(biometricLog, "hesitating")}`;

    const result = streamText({
      model: clientApiKey
        ? createGoogleGenerativeAI({ apiKey })("gemini-2.0-flash-exp")
        : google("gemini-2.0-flash-exp"),
      system: DEBRIEF_PROMPT,
      messages: [
        {
          role: "user",
          content: debriefContext,
        },
      ],
      maxOutputTokens: 1500,
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    console.error("[Debrief API Error]", error);

    // Check for specific API errors
    if (error && typeof error === "object" && "message" in error) {
      const message = String(error.message).toLowerCase();

      if (message.includes("api key") || message.includes("auth")) {
        return new Response(
          JSON.stringify({
            error: "Invalid API key. Please check your Gemini API key.",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      if (message.includes("quota") || message.includes("rate limit")) {
        return new Response(
          JSON.stringify({
            error: "API quota exceeded. Please wait and try again.",
          }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Failed to generate debrief" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

function avg(log: Record<string, number>[], key: string): string {
  if (log.length === 0) return "N/A";
  const sum = log.reduce((s, entry) => s + (entry[key] ?? 0), 0);
  return (sum / log.length).toFixed(2);
}

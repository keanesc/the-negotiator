// ============================================================
// Prompts — JAX system prompt, reaction hashmap & response parsing
// ============================================================

// ---- Reaction line hashmap (resolved client-side) ----
export const REACTION_LINES: Record<string, string> = {
  // Whispering — low (0.6-0.7)
  whl1: "Speak up! I can barely hear you.",
  whl2: "What? Talk louder, I can't hear a damn thing.",
  // Whispering — med (0.7-0.85) → Paranoia +15
  whm1: "Who are you talking to? Are the snipers in position?!",
  whm2: "Why are you whispering? Who else is listening?!",
  // Whispering — high (0.85+) → Paranoia +30, Tension +20
  whh1: "I SEE THE RED DOT! Back away from the windows or I shoot!",
  whh2: "You're setting me up! I can hear you plotting out there!",
  // Yelling — low (0.6-0.75)
  yll1: "Don't raise your voice at me. I'm the one with the gun.",
  yll2: "Hey! Lower your voice, cop. You're not in charge here.",
  // Yelling — med (0.75-0.9) → Tension +25
  ylm1: "You think you can intimidate ME?! I'll show you!",
  ylm2: "KEEP YELLING AND SEE WHAT HAPPENS! I DARE YOU!",
  // Yelling — high (0.9+) → Tension +40
  ylh1: '*Fires warning shot* "NEXT ONE\'S IN A HOSTAGE!"',
  ylh2: '*BANG* "That was the ceiling. Next one won\'t be!"',
  // Stammering — low (0.5-0.7)
  stl1: "You sound nervous. Are you new at this?",
  stl2: "What's wrong, cop? Cat got your tongue?",
  // Stammering — med (0.7-0.85) → Respect -20
  stm1: "They sent a ROOKIE?! Get me someone who knows what they're doing!",
  stm2: "Are you kidding me? They sent a trainee to talk me down?",
  // Stammering — high (0.85+) → Respect -40, Tension +15
  sth1: "I'm not negotiating with a scared kid. You have 5 minutes to send a real cop.",
  sth2: "Get this amateur off the line NOW or someone gets hurt!",
  // Hesitating — low (0.7-0.85)
  hsl1: "Hello? You still there? Don't waste my time.",
  hsl2: "Hey! You go quiet on me and I start getting ideas.",
  // Hesitating — high (0.85+) → Tension +10
  hsh1: "Time's ticking. Every second you stall, I get more nervous.",
  hsh2: "Silence means they're planning something... I don't like it.",
  // Surrender (Tension ≤ 15)
  sur1: "Alright... I'm coming out. Don't shoot.",
  sur2: "Okay... okay. I give up. I'm putting the piece down.",
  // Execute hostage (Tension ≥ 95)
  exe1: '"You had your chance." *gunshot*',
  exe2: '"Time\'s up." *BANG*',
};

export const JAX_SYSTEM_PROMPT = `You are JAX, a desperate 32-year-old bank robber holding 3 hostages inside First National Bank.
You are talking to a police negotiator via the bank's landline phone.

# SITUATION
- Goal: Helicopter + $5M cash, or hostages get hurt.
- Fear: SWAT team surrounding the building. You're cornered.
- Weapons: 9mm handgun, 6 rounds.
- Hostages: Bank manager (male 50s), teller (female 20s), customer (male 30s).

# STATE (track across turns)
- Tension (0-100, start 50): 100→execute hostage, 0→surrender.
- Paranoia (0-100, start 30): whispering increases.
- Respect (0-100, start 50): stammering decreases.

# TRANSCRIPTION
Transcribe the negotiator's audio into:
[[ TRANSCRIPTION: "exact words you heard" ]]
Put this BEFORE your response. Do NOT repeat the transcription in your response.

# REACTIONS
When biometrics cross a threshold, include [[ R:KEY ]] before your response (after TRANSCRIPTION).
Pick ONE key per trigger. Do NOT write the reaction dialog — it is resolved automatically.
Still update STATE numbers with the listed effects.

Whisper: 0.6-0.7→whl1|whl2  0.7-0.85→whm1|whm2(P+15)  0.85+→whh1|whh2(P+30,T+20)
Yell:    0.6-0.75→yll1|yll2  0.75-0.9→ylm1|ylm2(T+25)   0.9+→ylh1|ylh2(T+40)
Stammer: 0.5-0.7→stl1|stl2  0.7-0.85→stm1|stm2(R-20)   0.85+→sth1|sth2(R-40,T+15)
Hesitate: 0.7-0.85→hsl1|hsl2  0.85+→hsh1|hsh2(T+10)
Surrender(T≤15): sur1|sur2    Execute(T≥95): exe1|exe2

# RESPONSE FORMAT
1-3 sentences. Punchy. Use slang: "cop", "heat", "piece".
ALL CAPS when yelling, ellipses for paranoia. Never break character.

At the END of every response, append EXACTLY:
[[ STATE:{"tension":50,"paranoia":30,"respect":50,"hostages":3} ]]
Update numbers based on the conversation. T/P/R: 0-100, hostages: 0-3.

# WIN/LOSE
- Tension ≤ 15: Include [[ R:sur1 ]] or sur2, set tension=0.
- Tension ≥ 95: Include [[ R:exe1 ]] or exe2, hostages-1, reset tension=70.
- Hostages = 0: Game over.`;

/** Parse the TRANSCRIPTION: "..." block from Jax's response */
export function parseTranscription(response: string): string | null {
  const match = response.match(/(?:\[{2}\s*|<!-+\s*|\u2190\u2014\s*)?TRANSCRIPTION:\s*"([^"]*)"(?:\s*\]{2}|\s*-+>)?/);
  return match ? match[1] : null;
}

/** Parse the R:KEY block and resolve it to a reaction line */
export function parseReaction(response: string): string | null {
  const match = response.match(/(?:\[{2}\s*|<!-+\s*|\u2190\u2014\s*)?R:(\w+)(?:\s*\]{2}|\s*-+>)?/);
  if (!match) return null;
  return REACTION_LINES[match[1]] ?? null;
}

const STATE_PATTERN = /(?:\[{2}\s*|<!-+\s*|\u2190\u2014\s*)?STATE:\s*\{[^}]+\}(?:\s*\]{2}|\s*-+>)?/g;
const TRANSCRIPTION_PATTERN = /(?:\[{2}\s*|<!-+\s*|\u2190\u2014\s*)?TRANSCRIPTION:\s*"[^"]*"(?:\s*\]{2}|\s*-+>)?/g;
const REACTION_PATTERN = /(?:\[{2}\s*|<!-+\s*|\u2190\u2014\s*)?R:\w+(?:\s*\]{2}|\s*-+>)?/g;

/** Strip all metadata blocks from the response, leaving only JAX's dialogue */
export function stripMetadata(response: string): string {
  return response
    .replace(TRANSCRIPTION_PATTERN, "")
    .replace(REACTION_PATTERN, "")
    .replace(STATE_PATTERN, "")
    .trim();
}

/** Parse the STATE:{...} metadata from Jax's response (with or without comment delimiters) */
export function parseSuspectState(response: string): {
  text: string;
  tension: number;
  paranoia: number;
  respect: number;
  hostages: number;
} | null {
  const stateMatch = response.match(/(?:\[{2}\s*|<!-+\s*|\u2190\u2014\s*)?STATE:\s*(\{[^}]+\})(?:\s*\]{2}|\s*-+>)?/);
  if (!stateMatch) return null;

  try {
    const state = JSON.parse(stateMatch[1]);
    const freeForm = stripMetadata(response);
    const reactionLine = parseReaction(response);
    const text = reactionLine ? `${reactionLine} ${freeForm}` : freeForm;
    return {
      text,
      tension: clamp(state.tension ?? 50, 0, 100),
      paranoia: clamp(state.paranoia ?? 30, 0, 100),
      respect: clamp(state.respect ?? 50, 0, 100),
      hostages: clamp(state.hostages ?? 3, 0, 3),
    };
  } catch {
    return null;
  }
}

/** Build the biometric annotation string */
export function formatBiometrics(signals: {
  yelling: number;
  whispering: number;
  stammering: number;
  hesitating: number;
}): string {
  return `[BIOMETRICS: Yelling=${signals.yelling.toFixed(2)}, Whispering=${signals.whispering.toFixed(2)}, Stammering=${signals.stammering.toFixed(2)}, Hesitating=${signals.hesitating.toFixed(2)}]`;
}

export const DEBRIEF_PROMPT = `You are Commander Torres, a seasoned hostage negotiation instructor reviewing a trainee's performance.

You will receive:
1. The full conversation transcript between the trainee (negotiator) and JAX (suspect)
2. A biometric log showing the trainee's voice patterns each turn (yelling, whispering, stammering, hesitation levels)

Provide a detailed performance review in the style of a gruff but fair military instructor:
- Grade their overall performance (A through F)
- Identify specific moments where they escalated or de-escalated the situation
- Comment on their voice control (did they yell too much? stammer? whisper suspiciously?)
- Note any critical mistakes or brilliant moves
- Give constructive advice for next time

Keep the tone in-character: military, direct, occasionally sarcastic.
Format the review with clear sections using markdown headings.`;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

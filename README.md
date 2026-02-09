# Under Pressure - Built for Gemini 3 Hackathon

A tense game where you play as a hostage negotiator and control the story through your voice.

## Getting Started

### 1. Setup Your API Key

This game requires a Google Gemini API key. You have two options:

#### Option A: Server-side setup (for local development)\*\*

1. Get your API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Add your API key to `.env.local`:
   ```
   GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
   ```

**Option B: Client-side setup (for deployed apps)**

When you first launch the game, you'll be prompted to enter your API key. It will be stored securely in your browser.

### 2. Run the Development Server

```bash
$ bun install
$ bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

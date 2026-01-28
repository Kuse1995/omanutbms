

# Plan: Upgrade Omanut Advisor to Kimi K2.5 API

## Overview
We'll replace the current Lovable AI Gateway (Google Gemini) with Moonshot AI's **Kimi K2.5** model - a state-of-the-art multimodal model with 256K context window, advanced reasoning, and native thinking capabilities.

---

## Why Kimi K2.5?
- **256K context window** - Can handle much longer conversation histories and business context
- **Advanced reasoning** - Built-in "thinking mode" for complex business analysis
- **Multimodal** - Supports image/video analysis (future enhancement potential)
- **OpenAI-compatible API** - Easy migration, same format as current implementation

---

## What You'll Need
Since you have a Moonshot API key ready, I'll securely store it as a secret in your backend.

---

## Technical Implementation

### Step 1: Add Moonshot API Key as Secret
- Use the secure secrets tool to store your `MOONSHOT_API_KEY`
- This will be accessible in the edge function via `Deno.env.get("MOONSHOT_API_KEY")`

### Step 2: Update Edge Function (`supabase/functions/omanut-advisor/index.ts`)

**Current setup:**
```typescript
// Uses Lovable AI Gateway
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
  body: JSON.stringify({ model: "google/gemini-3-flash-preview", ... })
});
```

**New setup:**
```typescript
// Uses Moonshot AI directly
const MOONSHOT_API_KEY = Deno.env.get("MOONSHOT_API_KEY");
if (!MOONSHOT_API_KEY) {
  throw new Error("MOONSHOT_API_KEY is not configured");
}

const response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${MOONSHOT_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "kimi-k2.5",  // or "kimi-k2-turbo-preview" for faster responses
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    stream: true,
    thinking: { type: "enabled" },  // Enable deep reasoning mode
    temperature: 0.6,
  }),
});
```

### Step 3: Enhanced System Prompt for Kimi
Update the advisor personality to leverage Kimi's reasoning capabilities:
- Add guidance to use step-by-step thinking for complex business questions
- Leverage the larger context window for more historical data

### Step 4: Error Handling
Update error handling for Moonshot-specific status codes:
- Rate limits (429)
- Authentication errors (401)
- Balance/quota errors

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/omanut-advisor/index.ts` | Replace API endpoint, update auth, add Kimi-specific params |
| Backend secrets | Add `MOONSHOT_API_KEY` |

---

## Model Options

| Model | Speed | Best For |
|-------|-------|----------|
| `kimi-k2.5` | Slower | Complex reasoning, full thinking mode |
| `kimi-k2-turbo-preview` | Faster | Quick responses, everyday queries |
| `kimi-k2-thinking` | Medium | Deep analysis with visible reasoning chain |

**Recommendation:** Use `kimi-k2.5` with thinking enabled for the business advisor - it provides better analysis of your sales data, inventory, and actionable recommendations.

---

## Streaming Format
Kimi K2.5 uses the same SSE (Server-Sent Events) streaming format as OpenAI, so the frontend (`OmanutAdvisor.tsx`) doesn't need changes - it already handles SSE correctly.

---

## Testing Plan
After implementation:
1. Open the Advisor chat
2. Ask "How's business today?" - should get real-time analysis
3. Ask "What should I restock?" - should analyze inventory with reasoning
4. Test error handling by temporarily using an invalid key

---

## Cost Consideration
Kimi K2.5 pricing (from Moonshot AI):
- Input: $0.60 per million tokens
- Output: $3.00 per million tokens

This is competitive with other frontier models while providing the 256K context advantage.

---

## Optional Future Enhancements
Once Kimi is integrated, we can add:
- **Image analysis**: Let users upload receipts/invoices for AI processing
- **Visible thinking**: Show the advisor's reasoning process in the UI
- **Web search**: Kimi supports built-in web search for market research


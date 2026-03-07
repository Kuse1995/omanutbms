

# Migrate All AI Features from Lovable AI to Your Own Gemini API

## Overview
You have **9 edge functions** using the Lovable AI gateway and **1 function** (omanut-advisor) also using Moonshot. We'll switch all of them to call the Google Gemini API directly using your own API key.

## What You'll Need
- A **Google Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikeys)
- I'll securely store it as `GEMINI_API_KEY` in your backend secrets

## Model Mapping (Lovable AI → Google Gemini Direct)

| Lovable AI Model | Direct Gemini Model |
|---|---|
| `google/gemini-2.5-flash` | `gemini-2.5-flash` |
| `google/gemini-2.5-pro` | `gemini-2.5-pro` |
| `google/gemini-3-flash-preview` | `gemini-2.5-flash` (stable fallback) |
| `google/gemini-3-pro-image-preview` | `gemini-2.0-flash-exp` (image gen) |

Note: `gemini-3-*` models are Lovable-specific preview names. We'll map them to the closest publicly available Gemini models.

## Edge Functions to Update (9 total)

Each function gets the same change pattern:
- Replace `LOVABLE_API_KEY` → `GEMINI_API_KEY`
- Replace gateway URL `https://ai.gateway.lovable.dev/v1/chat/completions` → `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`
- Update model names to direct Gemini equivalents
- Google's OpenAI-compatible endpoint accepts the same request/response format, so tool calling and streaming work unchanged

| # | Function | Current Model | Notes |
|---|---|---|---|
| 1 | `blog-writer` | gemini-2.5-flash | Tool calling |
| 2 | `bms-intent-parser` | gemini-2.5-pro | Tool calling |
| 3 | `document-to-csv` | gemini-2.5-flash | Tool calling |
| 4 | `estimate-design-labor` | gemini-3-flash-preview | Tool calling |
| 5 | `estimate-material-cost` | gemini-3-flash-preview | Tool calling |
| 6 | `generate-financial-report` | gemini-3-flash-preview | Standard completion |
| 7 | `generate-outfit-views` | gemini-3-pro-image-preview | Image generation (may need special handling) |
| 8 | `suggest-service-details` | gemini-2.5-flash | Tool calling |
| 9 | `omanut-advisor` | Moonshot primary + Lovable AI fallback | Keep Moonshot as primary, replace Lovable AI fallback with direct Gemini |

## Special Cases

### `generate-outfit-views` (Image Generation)
This uses `gemini-3-pro-image-preview` with `modalities: ["image", "text"]`. Google's public API supports image generation via `gemini-2.0-flash-exp` with the same modalities parameter through the Gemini API (not the OpenAI-compatible endpoint). This function will need to call the native Gemini API endpoint instead.

### `omanut-advisor` (Streaming)
Moonshot stays as the primary model (you already have that key). The Lovable AI fallback will switch to direct Gemini with streaming — the OpenAI-compatible endpoint supports `stream: true` the same way.

## Steps
1. Request your Gemini API key via the secrets tool
2. Update all 9 edge functions with the new endpoint and key
3. Test that each function works correctly


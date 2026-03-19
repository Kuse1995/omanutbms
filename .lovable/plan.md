

# Implement Gemini Embeddings Across the Platform

## What Are Embeddings and Why They Matter

Embeddings convert text into numerical vectors that capture meaning. Instead of keyword matching ("cement" won't find "building materials"), embeddings understand that these concepts are related. This upgrades every search and matching operation in the platform from string matching to semantic understanding.

## Where Embeddings Will Be Used

### 1. Smart Product Search (highest impact)
Currently all product/inventory search uses `.toLowerCase().includes()` — exact substring matching. With embeddings, a user searching "building materials" would find cement, sand, and bricks. A WhatsApp user saying "the round thing for water" could match "LifeStraw Personal Filter."

### 2. WhatsApp Intent Parsing Fallback
The intent parser sometimes fails on very broken English or novel expressions. Before falling back to "unknown intent," we can compare the user's message embedding against a library of known intent examples to find the closest match — dramatically reducing "I don't understand" responses.

### 3. Customer & Contact Deduplication
When creating contacts via WhatsApp or the dashboard, embed the name and compare against existing contacts to flag potential duplicates (e.g., "J. Mulenga" vs "John Mulenga" vs "Mulenga John").

### 4. Smart Advisor Context (Omanut Advisor)
Instead of sending the entire business context to the AI advisor, embed the user's question and retrieve only the most relevant data chunks — reducing token usage and improving answer quality.

### 5. Blog Content Suggestions
When writing blog posts, find semantically similar existing posts to avoid duplication and suggest related topics.

## Technical Architecture

### New Edge Function: `generate-embeddings`
A central embedding service that all other functions call:

```text
POST /functions/v1/generate-embeddings
Body: { texts: ["cement bags", "building materials"], model: "text-embedding-004" }
Returns: { embeddings: [[0.12, -0.34, ...], [...]] }
```

Uses the Gemini Embedding API (`text-embedding-004` model, 768 dimensions).

### Database: `embeddings` Table
Stores pre-computed embeddings with pgvector:

```text
embeddings table:
  id, tenant_id, entity_type (product/contact/intent/blog),
  entity_id, content_text, embedding (vector(768)),
  created_at, updated_at
```

Requires enabling the `vector` PostgreSQL extension.

### Embedding Lifecycle
- **Products**: Generate embedding on insert/update (name + description + category)
- **Contacts**: Generate embedding on insert (name + company + notes)  
- **Intent examples**: Pre-seeded library of ~50 example phrases per intent
- **Blog posts**: Generate on publish (title + excerpt)

### Search Flow

```text
User types "building supplies" in search
  → Frontend calls generate-embeddings with query
  → pgvector finds nearest neighbors: SELECT * FROM embeddings 
    WHERE tenant_id = X ORDER BY embedding <=> query_vector LIMIT 10
  → Returns matched entity_ids (product IDs)
  → Frontend fetches full product records
```

## Changes Required

| File / Resource | Change |
|---|---|
| **Migration** | Enable `vector` extension, create `embeddings` table with indexes |
| **`generate-embeddings/index.ts`** (new) | Central edge function calling Gemini embedding API |
| **`embed-on-change/index.ts`** (new) | Webhook-triggered function that embeds products/contacts on insert/update |
| **`semantic-search/index.ts`** (new) | Edge function: takes query text + entity_type, returns nearest matches |
| **`bms-intent-parser/index.ts`** | Add embedding fallback for low-confidence or unknown intents |
| **`bms-api-bridge/index.ts`** | Wire `check_stock` and `list_products` to use semantic search when keyword match returns nothing |
| **`ProductCombobox.tsx`** | Add semantic search option when exact match returns few results |
| **`InventoryAgent.tsx`** | Enhance search to call semantic-search endpoint as fallback |
| **`CustomersManager.tsx`** | Add duplicate detection on new contact creation |

## Implementation Order

1. Database migration (enable vector, create table)
2. `generate-embeddings` edge function
3. `semantic-search` edge function  
4. `embed-on-change` edge function (auto-embed on data changes)
5. Wire into product search (ProductCombobox, InventoryAgent)
6. Wire into WhatsApp intent parser fallback
7. Wire into customer deduplication
8. Wire into advisor context retrieval

## Notes

- Gemini `text-embedding-004` is called via `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent` using the existing `GEMINI_API_KEY` — no new secrets needed.
- pgvector's `<=>` operator (cosine distance) handles similarity ranking.
- Embeddings are tenant-scoped so tenants never see each other's data.
- The embedding dimension is 768 (Gemini text-embedding-004 default).


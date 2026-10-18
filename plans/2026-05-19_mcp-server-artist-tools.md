# Plan: Merch From MCP Server — Artist-Focused Phase 1

> Created: 2026-05-19
> Branch: feat/crowdfunding-demo
> Status: Pending execution
> Target: Remote MCP server for Claude Desktop → design → mockup pipeline

---

## Goal

Build a remote MCP server (SSE/HTTP transport) that lets artists create merch designs, iterate on them, and visualize mockups directly from Claude Desktop. The artist says "create a Japanese dragon t-shirt" and gets a mockup — all in one conversation, no website needed.

This is the **crowdfunding demo hero feature**: no competitor in the POD industry offers MCP-powered merch creation.

---

## Scope

### In Scope (Phase 1 — 8 Tools)

| # | Tool | What It Does | Backend |
|---|------|-------------|---------|
| 1 | `search_catalog` | Find blank garments by query, category, brand, material, price | Typesense (working) |
| 2 | `list_styles` | Show 6 available art styles (Japanese, Blackwork, etc.) | Static data (working) |
| 3 | `list_mockup_templates` | Show available product templates, views, placements | Python service :8000 (working) |
| 4 | `generate_design` | Create design from text prompt + optional art style | fal.ai Nano Banana 2, reference-guided (STUB → needs wiring) |
| 5 | `iterate_design` | Refine design conversationally (up to 10 rounds) | fal.ai Kontext (STUB → needs wiring) |
| 6 | `remove_background` | Transparent PNG export | fal.ai Ideogram (MISSING → needs creation) |
| 7 | `upscale_design` | Upscale to print resolution (2048→4096+) | fal.ai Upscaler (STUB → needs wiring) |
| 8 | `generate_mockup` | Place design on product mockup | Python service :8000 (working) |

### Out of Scope (Later Phases)
- Commerce tools (create_product, checkout, orders) — Phase 2
- stdio transport — After SSE is stable
- ChatGPT Custom GPT integration — Separate follow-up
- Gemini MCP integration — Wait for Google's MCP support
- Dev-facing API keys — Phase 3
- Resources (dynamic catalog data) — Can add later

---

## Acceptance Criteria

1. Claude Desktop connects to Merch From MCP server via SSE transport
2. Artist authenticates via Clerk OAuth (browser popup → sign in → token)
3. Complete 8-step workflow succeeds:
   - "Show me t-shirt blanks" → catalog results
   - "What art styles?" → 6 styles listed
   - "Generate a Japanese dragon" → design image returned
   - "Make it more fierce" → refined design
   - "Remove background" → transparent PNG
   - "Upscale for print" → high-res version
   - "Show mockup templates for t-shirts" → template list
   - "Put it on a black t-shirt, front chest" → mockup image
4. Each tool returns cost information (cents)
5. Error states handled gracefully (rate limits, invalid URLs, service down)

---

## Dependencies

| Dependency | Status | Action Needed |
|------------|--------|---------------|
| `@modelcontextprotocol/sdk` v1.29.0 | Needs install | `bun add @modelcontextprotocol/sdk` |
| `express` + `cors` | Needs install | `bun add express cors && bun add -D @types/express @types/cors` |
| Typesense search | ✅ Working | None — `searchTool.ts` ready |
| Mockup Python service (:8000) | ✅ Working | None — `MockupClient` ready |
| Style preset definitions | ✅ Defined | None — `LORA_STYLES` constant (legacy name; style prompt templates) ready |
| `@fal-ai/client` | Needs install | `bun add @fal-ai/client` |
| `FAL_KEY` env var | Needs config | Add to .env |
| `@clerk/backend` | Likely installed | Verify — used in API routes already |
| `CLERK_SECRET_KEY` env var | ✅ Exists | Already in .env |
| Clerk OAuth config | Needs setup | Add MCP server URL as allowed origin in Clerk dashboard |

---

## Architecture

```
/app/src/mcp/                        # NEW — MCP server package
├── server.ts                        # McpServer init + tool registration
├── transport.ts                     # Express app + SSEServerTransport + session map
├── auth.ts                          # Clerk JWT verification middleware
├── well-known.ts                    # OAuth discovery endpoints (RFC 9728)
└── tools/
    ├── catalog.ts                   # search_catalog, list_styles, list_mockup_templates
    ├── design.ts                    # generate_design, iterate_design, remove_background, upscale_design
    └── mockup.ts                    # generate_mockup

/app/src/lib/ai/
└── falClient.ts                     # MODIFIED — implement 4 fal.ai functions + add removeBackground

/app/scripts/
└── mcp-server.ts                    # NEW — entry point (bun run scripts/mcp-server.ts)

/app/package.json                    # MODIFIED — add deps + "mcp" script
```

### Data Flow

```
Claude Desktop
  │
  ├── GET /sse ────────────────────── SSE event stream (MCP protocol)
  ├── POST /messages ──────────────── Tool calls (JSON-RPC)
  │
  ▼
Express Server (port 4000)
  ├── Auth middleware (Clerk JWT)
  ├── MCP Server (tool registry)
  │     │
  │     ├── search_catalog ────────► Typesense
  │     ├── list_styles ──────► Static data
  │     ├── list_mockup_templates ─► Python :8000
  │     ├── generate_design ───────► fal.ai Nano Banana 2
  │     ├── iterate_design ────────► fal.ai Kontext
  │     ├── remove_background ─────► fal.ai Ideogram
  │     ├── upscale_design ────────► fal.ai Upscaler
  │     └── generate_mockup ───────► Python :8000
  │
  └── /.well-known/oauth-* ──────── OAuth discovery (Clerk)
```

---

## Task Breakdown

---

### T1: MCP Server Foundation
**Priority:** High | **Complexity:** M (1-2h) | **Assignment:** SUBAGENT | **Group:** A

Create the MCP server scaffolding with SSE transport, session management, and a startup script.

**Subtasks:**

- **T1.1** Install dependencies
  ```bash
  cd /app && bun add @modelcontextprotocol/sdk express cors && bun add -D @types/express @types/cors
  ```

- **T1.2** Create `/app/src/mcp/server.ts`
  - Import `Server` from `@modelcontextprotocol/sdk/server/index.js`
  - Import `StdioServerTransport` (for future use)
  - Initialize server with:
    ```ts
    const server = new Server(
      { name: 'merch-from', version: '0.1.0' },
      { capabilities: { tools: {} } }
    );
    ```
  - Export `server` and a `registerAllTools()` function that imports and calls each tool module
  - `[ARCH]` Keep tool registration separate from server init so tools can be tested independently

- **T1.3** Create `/app/src/mcp/transport.ts`
  - Create Express app
  - Add CORS middleware with `Access-Control-Allow-Origin: *` and exposed headers `Mcp-Session-Id`
  - `GET /sse` — Create `SSEServerTransport`, connect server, store in sessions map
  - `POST /messages` — Look up transport by session ID from `Mcp-Session-Id` header, delegate `handleRequest`
  - Session management: `Map<string, SSEServerTransport>` with cleanup on disconnect
  - `[GOTCHA]` SSEServerTransport in v1 uses separate GET /sse (event stream) and POST /messages (tool calls). The POST handler receives the session ID from the SSE connection.
  - `[GOTCHA]` The v1 SSE pattern: GET /sse creates the transport and sends an `endpoint` event with the POST URL (includes session ID). The client then POSTs to that URL. Session ID is in the URL path, not a header.
  - Export `createApp()` that returns the Express app

- **T1.4** Create `/app/scripts/mcp-server.ts`
  ```ts
  import { createApp } from '../src/mcp/transport';

  const PORT = parseInt(process.env.MCP_PORT || '4000');
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Merch From MCP server listening on port ${PORT}`);
    console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
  });
  ```

- **T1.5** Add script to `/app/package.json`
  ```json
  "scripts": {
    ...existing,
    "mcp": "bun run scripts/mcp-server.ts"
  }
  ```

**Files Created:** `src/mcp/server.ts`, `src/mcp/transport.ts`, `scripts/mcp-server.ts`
**Files Modified:** `package.json`

**Verification:**
```bash
cd /app && bun mcp
# Should print: "Merch From MCP server listening on port 4000"
# Should print: "SSE endpoint: http://localhost:4000/sse"
# curl http://localhost:4000/sse should open SSE connection
```

---

### T2: Catalog & Reference Tools (3 tools)
**Priority:** High | **Complexity:** S (30-60min) | **Assignment:** SUBAGENT | **Group:** A

Implement the 3 tools that work immediately with existing backend services. No fal.ai dependency.

**Subtasks:**

- **T2.1** Create `/app/src/mcp/tools/catalog.ts`
  - Import `ListToolsRequestSchema` and `CallToolRequestSchema` from SDK types
  - Register tools using `server.setRequestHandler(ListToolsRequestSchema, ...)` and `server.setRequestHandler(CallToolRequestSchema, ...)`
  - `[ARCH]` Each tool module exports a `register(server)` function. The main server.ts calls all register functions.

- **T2.2** Implement `search_catalog` tool
  - **Schema:**
    ```json
    {
      "name": "search_catalog",
      "description": "Search the Merch From blank garment catalog. Find t-shirts, hoodies, tote bags and other products by name, brand, material, or category. Use this to help artists find the right blank for their design.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string", "description": "Search query (e.g., 'organic cotton t-shirt', 'heavyweight hoodie')" },
          "category": { "type": "string", "description": "Filter by category (tshirts, hoodies, sweatshirts, tote-bags, accessories)", "enum": ["tshirts", "hoodies", "sweatshirts", "tote-bags", "accessories"] },
          "brand": { "type": "string", "description": "Filter by brand (e.g., Stanley/Stella, Gildan)" },
          "material": { "type": "string", "description": "Filter by material (e.g., organic, cotton, recycled, polyester)" },
          "maxPrice": { "type": "number", "description": "Maximum price in EUR cents" },
          "limit": { "type": "number", "description": "Max results (default 5)", "default": 5 }
        },
        "required": ["query"]
      }
    }
    ```
  - **Handler:** Calls `searchCatalogForAgent(query, filters, limit)` from `@/lib/ai/searchTool`
  - **Returns:** Formatted text with product name, brand, SKU, price, and description for each result
  - `[DEP]` Requires `TYPESENSE_URL` and `TYPESENSE_API_KEY` env vars. If not configured, returns empty results with a helpful message.

- **T2.3** Implement `list_styles` tool
  - **Schema:**
    ```json
    {
      "name": "list_styles",
      "description": "List available AI art styles for design generation. Each style produces a distinct visual aesthetic. Use this to show artists their style options before generating a design.",
      "inputSchema": { "type": "object", "properties": {} }
    }
    ```
  - **Handler:** Reads `LORA_STYLES` from `@/lib/ai/falClient`
  - **Returns:** Formatted list of styles with name, description, best use cases, and example prompt

- **T2.4** Implement `list_mockup_templates` tool
  - **Schema:**
    ```json
    {
      "name": "list_mockup_templates",
      "description": "List available product mockup templates. Shows what product types, views (flat/worn/closeup), and print placements (front chest, back full, sleeve) are available. Use before generating a mockup.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "category": { "type": "string", "description": "Filter by category (tshirts, hoodies, etc.)" }
        }
      }
    }
    ```
  - **Handler:** Calls `mockupClient.getTemplates()`
  - **Returns:** Formatted list of templates with SKU, name, category, available views and placements
  - `[DEP]` Requires mockup Python service running on :8000. Returns error with instructions if unavailable.

**Files Created:** `src/mcp/tools/catalog.ts`

**Verification:**
- Start MCP server: `bun mcp`
- Connect Claude Desktop (or curl the SSE endpoint)
- Call `search_catalog` with query "t-shirt" → should return catalog results
- Call `list_styles` → should return 6 styles
- Call `list_mockup_templates` → should return templates (if Python service running)

---

### T3: fal.ai Client Implementation
**Priority:** HIGH (Critical Path) | **Complexity:** L (2-3h) | **Assignment:** MAIN SESSION | **Group:** B

Implement the 4 fal.ai functions in `falClient.ts` that the design tools depend on. This is the existing sprint Day 10+ work.

**Subtasks:**

- **T3.1** Install fal.ai client
  ```bash
  cd /app && bun add @fal-ai/client
  ```
  - `[DEP]` Requires `FAL_KEY` env var. Get from fal.ai dashboard.

- **T3.2** Initialize fal.ai client in `falClient.ts`
  - Replace the `null` falClient with actual initialization:
    ```ts
    import { fal } from '@fal-ai/client';
    fal.config({ credentials: process.env.FAL_KEY });
    ```
  - `[GOTCHA]` fal.ai subscription key vs key — check which auth method is needed for the Nano Banana 2 endpoints.

- **T3.3** Implement `generateDesign()`
  - Current signature (already defined, just throws):
    ```ts
    async function generateDesign(params: {
      prompt: string;
      styleId?: LoRAStyleSlug;
      width?: number;
      height?: number;
    }): Promise<{ imageUrl: string; seed: number }>
    ```
  - Implementation:
    1. If `styleId` provided, prepend `LORA_STYLES[styleId].triggerWord + ', '` to the prompt and attach that style's reference (anchor) image
    2. Call `fal.subscribe(FAL_ENDPOINTS.EDIT, { input: { prompt, image_urls: [anchorImageUrl] } })` (`fal-ai/nano-banana-2/edit`; reference-guided). Without a style, call `FAL_ENDPOINTS.GENERATE` (`fal-ai/nano-banana-2`)
    3. Return `{ imageUrl: result.images[0].url, seed: result.seed }`
  - `[GOTCHA]` fal.ai `subscribe()` auto-polls until complete. Some endpoints use `fal.run()` for fire-and-forget. Nano Banana 2 uses `subscribe`.
  - `[GOTCHA]` Default dimensions: 1024x1024 if not specified. Aspect ratio mapping: square=1024x1024, portrait=768x1024, landscape=1024x768.

- **T3.4** Implement `editDesign()`
  - Current signature:
    ```ts
    async function editDesign(params: {
      imageUrl: string;
      instruction: string;
      editRound: number;
    }): Promise<{ imageUrl: string; editRound: number }>
    ```
  - Implementation:
    1. Select endpoint via `selectKontextModel(params.editRound)` (already implemented — returns KONTEXT or KONTEXT_MAX)
    2. Call `fal.subscribe(endpoint, { input: { image_url: params.imageUrl, prompt: params.instruction } })`
    3. Return `{ imageUrl: result.images[0].url, editRound: params.editRound + 1 }`
  - `[ARCH]` Auto-escalation at round 4+ to Kontext MAX is handled by `selectKontextModel()` which is already implemented.

- **T3.5** Create `removeBackground()` (NEW function — does not exist yet)
  - Add to `falClient.ts`:
    ```ts
    export async function removeBackground(params: {
      imageUrl: string;
    }): Promise<{ imageUrl: string }>
    ```
  - Implementation:
    1. Call `fal.subscribe(FAL_ENDPOINTS.REMOVE_BACKGROUND, { input: { image_url: params.imageUrl } })`
    2. Return `{ imageUrl: result.images[0].url }`
  - `[GOTCHA]` The endpoint is `fal-ai/ideogram/remove-background`. Verify the exact input/output schema in fal.ai docs.

- **T3.6** Implement `upscaleDesign()`
  - Current signature:
    ```ts
    async function upscaleDesign(params: {
      imageUrl: string;
    }): Promise<{ imageUrl: string; originalSize: string; upscaledSize: string }>
    ```
  - Implementation:
    1. Call `fal.subscribe(FAL_ENDPOINTS.UPSCALER, { input: { image_url: params.imageUrl } })`
    2. Return `{ imageUrl: result.images[0].url, originalSize: result.original_size, upscaledSize: result.upscaled_size }`
  - `[GOTCHA]` Verify the output field names — fal.ai upscaler may return different field names for sizes.

- **T3.7** Verify cost calculator still works
  - `calculateDesignCostCents()` is already implemented
  - Test: `calculateDesignCostCents({ generation: true, editRounds: 3, bgRemoval: true, upscale: true })` should return 14 ($0.14 total)
  - This function is used by MCP tools to report costs

**Files Modified:** `src/lib/ai/falClient.ts`

**Verification:**
```bash
# Test each function independently (can create a quick test script)
# generateDesign({ prompt: "a red dragon" }) → should return image URL
# editDesign({ imageUrl: "...", instruction: "make it blue", editRound: 1 }) → should return new URL
# removeBackground({ imageUrl: "..." }) → should return transparent PNG URL
# upscaleDesign({ imageUrl: "..." }) → should return upscaled URL
```

---

### T4: Design MCP Tools (4 tools)
**Priority:** High | **Complexity:** M (1-2h) | **Assignment:** SUBAGENT | **Group:** B

Register the 4 design tools in the MCP server. These call the fal.ai functions from T3. Can be built in parallel — tools will return graceful errors until T3 is complete.

**Subtasks:**

- **T4.1** Create `/app/src/mcp/tools/design.ts`
  - Import `generateDesign`, `editDesign`, `removeBackground`, `upscaleDesign` from `@/lib/ai/falClient`
  - Import `calculateDesignCostCents` from `@/lib/ai/falClient`
  - Export `register(server)` function

- **T4.2** Implement `generate_design` tool
  - **Schema:**
    ```json
    {
      "name": "generate_design",
      "description": "Generate an original merchandise design from a text description. Optionally apply an AI art style (Japanese, Blackwork, American Traditional, etc.). Returns the design image.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "prompt": { "type": "string", "description": "Description of the design to create" },
          "style": {
            "type": "string",
            "description": "Art style to apply",
            "enum": ["american-traditional", "japanese", "blackwork", "vintage-90s", "realism", "dark-art"]
          },
          "aspectRatio": {
            "type": "string",
            "description": "Design aspect ratio (default: square)",
            "enum": ["square", "portrait", "landscape"],
            "default": "square"
          }
        },
        "required": ["prompt"]
      }
    }
    ```
  - **Handler:**
    1. Map `aspectRatio` to dimensions (square=1024x1024, portrait=768x1024, landscape=1024x768)
    2. Call `generateDesign({ prompt, styleId: style, width, height })`
    3. Calculate cost: `calculateDesignCostCents({ generation: true, editRounds: 0, bgRemoval: false, upscale: false })`
    4. Return formatted result with image URL and cost
  - **Error handling:** Wrap in try/catch, return `{ content: [{ type: 'text', text: error.message }], isError: true }`

- **T4.3** Implement `iterate_design` tool
  - **Schema:**
    ```json
    {
      "name": "iterate_design",
      "description": "Refine an existing design with a text instruction. Supports multiple rounds of iteration (auto-escalates to higher quality after round 3). Use this to tweak colors, add details, change composition.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "imageUrl": { "type": "string", "description": "URL of the current design to edit" },
          "instruction": { "type": "string", "description": "What to change (e.g., 'add red accents', 'make the dragon more fierce')" },
          "currentRound": { "type": "number", "description": "Current iteration round number (starts at 1)", "default": 1 }
        },
        "required": ["imageUrl", "instruction"]
      }
    }
    ```
  - **Handler:**
    1. Call `editDesign({ imageUrl, instruction, editRound: currentRound })`
    2. Calculate cost for this round (rounds 1-3: $0.04, round 4+: $0.08)
    3. Return updated design URL with new round number and cost

- **T4.4** Implement `remove_background` tool
  - **Schema:**
    ```json
    {
      "name": "remove_background",
      "description": "Remove the background from a design image, producing a transparent PNG. Essential for print-ready merchandise artwork.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "imageUrl": { "type": "string", "description": "URL of the image to process" }
        },
        "required": ["imageUrl"]
      }
    }
    ```
  - **Handler:**
    1. Call `removeBackground({ imageUrl })`
    2. Return transparent PNG URL with cost ($0.02)

- **T4.5** Implement `upscale_design` tool
  - **Schema:**
    ```json
    {
      "name": "upscale_design",
      "description": "Upscale a design image to print resolution (typically 2048px to 4096px+). Required for high-quality merchandise printing.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "imageUrl": { "type": "string", "description": "URL of the image to upscale" }
        },
        "required": ["imageUrl"]
      }
    }
    ```
  - **Handler:**
    1. Call `upscaleDesign({ imageUrl })`
    2. Return upscaled URL with original/upscaled dimensions and cost ($0.03)

- **T4.6** Add graceful fallback for all design tools
  - Each tool handler wraps in try/catch
  - If fal.ai is not configured (FAL_KEY missing), return:
    ```
    "Design generation is not yet configured. The Merch From team is setting up the AI design pipeline. 
     Please try again later or contact support@merchfrom.com."
    ```
  - `[GOTCHA]` The fal.ai functions currently throw with specific messages. Check for these and return user-friendly messages.

**Files Created:** `src/mcp/tools/design.ts`

**Verification:**
- Start MCP server
- Call `generate_design` with prompt "test" → should return error (fal.ai stub) or image URL (if T3 done)
- After T3: should return actual design image

---

### T5: Mockup Tool (1 tool)
**Priority:** High | **Complexity:** S (30min) | **Assignment:** SUBAGENT | **Group:** B

Register the mockup generation tool. This uses the existing Python mockup service.

**Subtasks:**

- **T5.1** Create `/app/src/mcp/tools/mockup.ts`
  - Import `mockupClient` from `@/lib/mockup/mockup-client`
  - Export `register(server)` function

- **T5.2** Implement `generate_mockup` tool
  - **Schema:**
    ```json
    {
      "name": "generate_mockup",
      "description": "Generate a product mockup showing a design applied to a garment (t-shirt, hoodie, etc.). Shows the artist what their design looks like on the actual product.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "designUrl": { "type": "string", "description": "URL of the design image to place on the product" },
          "productSku": { "type": "string", "description": "SKU of the blank product (from list_mockup_templates or search_catalog)" },
          "colorCode": { "type": "string", "description": "Hex color code for the garment (default: '#000000' black)", "default": "#000000" },
          "placement": {
            "type": "string",
            "description": "Where to place the design on the product",
            "enum": ["front_chest", "back_full", "left_sleeve", "right_sleeve"],
            "default": "front_chest"
          },
          "view": {
            "type": "string",
            "description": "Camera view for the mockup",
            "enum": ["flat", "worn", "closeup"],
            "default": "flat"
          }
        },
        "required": ["designUrl", "productSku"]
      }
    }
    ```
  - **Handler:**
    1. Call `mockupClient.generateMockup({ design_url, product_sku, color_code, placement, views: [view] })`
    2. Return mockup images (web_res_url for display, high_res_url for download)
    3. Include processing time
  - `[GOTCHA]` The mockup API route handler requires `color_code` even though the type says optional. Default to `#000000` (black) in the MCP tool.
  - `[DEP]` Requires mockup Python service running on :8000. Returns error with setup instructions if unavailable.

**Files Created:** `src/mcp/tools/mockup.ts`

**Verification:**
- Start MCP server and mockup Python service
- Call `generate_mockup` with a design URL and product SKU → should return mockup images

---

### T6: Clerk OAuth Integration
**Priority:** High | **Complexity:** M (1-2h) | **Assignment:** MAIN SESSION | **Group:** B

Add authentication to the MCP server. Without this, anyone can connect and generate designs at your cost.

**Subtasks:**

- **T6.1** Create `/app/src/mcp/auth.ts`
  - Import `Clerk` from `@clerk/backend`
  - Implement token verification:
    ```ts
    import { verifyToken } from '@clerk/backend';

    export async function verifyClerkJWT(token: string) {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      return {
        userId: payload.sub,
        email: payload.email,
        role: payload.publicMetadata?.role,
      };
    }
    ```
  - `[GOTCHA]` Clerk's `verifyToken` validates JWT signature, expiration, and audience. Ensure the MCP server URL is configured as a valid audience in Clerk.

- **T6.2** Create auth middleware for Express
  ```ts
  export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Bearer token' });
    }
    const token = authHeader.slice(7);
    verifyClerkJWT(token)
      .then(user => { req.user = user; next(); })
      .catch(() => res.status(401).json({ error: 'Invalid token' }));
  }
  ```
  - `[ARCH]` Auth is applied to POST /messages and GET /sse. The /.well-known endpoints must be unauthenticated (discovery needs to work without auth).

- **T6.3** Create `/app/src/mcp/well-known.ts`
  - `/.well-known/oauth-protected-resource` — RFC 9728 metadata:
    ```json
    {
      "resource": "https://mcp.merchfrom.com",
      "authorization_servers": ["https://clerk.merchfrom.com"]
    }
    ```
  - `/.well-known/oauth-authorization-server` — Points to Clerk's OAuth endpoints
  - `[CRITICAL]` Claude Desktop's OAuth flow requires these endpoints. Without them, Claude Desktop cannot discover how to authenticate and the connection fails.

- **T6.4** Wire auth into `transport.ts`
  - Apply `requireAuth` middleware to POST /messages and GET /sse
  - Keep /.well-known routes unauthenticated
  - Pass `req.user` info to MCP tool handlers via request context
  - `[GOTCHA]` The SSE transport creates the connection on GET /sse. Auth must happen before the transport is created, not after.

- **T6.5** Clerk dashboard configuration
  - Add MCP server URL (e.g., `https://mcp.merchfrom.com`) as a permitted origin in Clerk
  - Configure OAuth redirect URLs
  - `[DEP]` This is a manual step in the Clerk dashboard, not code.

**Files Created:** `src/mcp/auth.ts`, `src/mcp/well-known.ts`
**Files Modified:** `src/mcp/transport.ts`

**Verification:**
- Start MCP server
- Without token: `curl -X POST http://localhost:4000/messages` → 401 Unauthorized
- With invalid token: `curl -H "Authorization: Bearer invalid" -X POST http://localhost:4000/messages` → 401
- With valid Clerk JWT: Should pass through to MCP handler
- /.well-known endpoints: Should return JSON without auth

---

### T7: Wire Tools into Server
**Priority:** High | **Complexity:** S (15min) | **Assignment:** MAIN SESSION | **Group:** C

Connect all tool modules to the MCP server.

**Subtasks:**

- **T7.1** Update `/app/src/mcp/server.ts`
  - Import all tool register functions:
    ```ts
    import { registerCatalogTools } from './tools/catalog';
    import { registerDesignTools } from './tools/design';
    import { registerMockupTools } from './tools/mockup';
    ```
  - Call each in `registerAllTools()`:
    ```ts
    export function registerAllTools(server: Server) {
      registerCatalogTools(server);
      registerDesignTools(server);
      registerMockupTools(server);
    }
    ```

- **T7.2** Update `/app/src/mcp/transport.ts`
  - Import `registerAllTools` from server.ts
  - Call `registerAllTools(server)` before `server.connect(transport)`
  - `[GOTCHA]` Tools must be registered BEFORE `server.connect()`. After connection, tool registration is ignored.

**Files Modified:** `src/mcp/server.ts`, `src/mcp/transport.ts`

**Verification:**
- Start MCP server
- Connect Claude Desktop
- Claude should see all 8 tools listed when calling `ListTools`

---

### T8: Integration & End-to-End Test
**Priority:** High | **Complexity:** M (1-2h) | **Assignment:** MAIN SESSION | **Group:** C

Full pipeline verification with Claude Desktop.

**Subtasks:**

- **T8.1** Configure Claude Desktop
  - Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):
    ```json
    {
      "mcpServers": {
        "merch-from": {
          "url": "http://localhost:4000/sse"
        }
      }
    }
    ```
  - `[GOTCHA]` For local development, use `http://localhost:4000/sse`. For remote, use the deployed URL.

- **T8.2** Test individual tools
  - `search_catalog("t-shirt")` → catalog results
  - `list_styles()` → 6 styles
  - `list_mockup_templates()` → template list (if Python service running)
  - `generate_design({ prompt: "a geometric wolf head" })` → design URL (if fal.ai wired)
  - `iterate_design({ imageUrl, instruction: "add blue tones" })` → refined design
  - `remove_background({ imageUrl })` → transparent PNG
  - `upscale_design({ imageUrl })` → high-res version
  - `generate_mockup({ designUrl, productSku })` → mockup images

- **T8.3** Test complete workflow (the crowdfunding demo flow)
  ```
  User: "I want to create a t-shirt with a Japanese-style dragon design"

  Claude should:
  1. search_catalog("t-shirt") → finds blanks
  2. list_styles() → shows Japanese style
  3. generate_design({ prompt: "bold dark Japanese dragon...", style: "japanese" }) → design
  4. remove_background({ imageUrl }) → transparent PNG
  5. upscale_design({ imageUrl }) → print resolution
  6. list_mockup_templates({ category: "tshirts" }) → templates
  7. generate_mockup({ designUrl, productSku, colorCode: "#000000" }) → mockup

  Result: Artist sees their design on a black t-shirt mockup
  ```

- **T8.4** Test error scenarios
  - Typesense not configured → graceful message, not crash
  - Mockup service down → error with retry suggestion
  - fal.ai rate limited → clear error with wait time
  - Invalid image URL → descriptive error
  - Auth token expired → 401, Claude Desktop re-authenticates

- **T8.5** Verify cost reporting
  - Each design tool should include cost in response
  - Full pipeline cost: ~$0.14 (generation $0.05 + bg removal $0.02 + upscale $0.03 + misc $0.04)

**Verification:**
- Complete 8-step workflow succeeds in Claude Desktop
- Mockup image visible in Claude's response
- Error states handled gracefully
- Costs reported accurately

---

## Parallelization Map

```
Group A (parallel, no dependencies — start immediately):
  T1: MCP Server Foundation (server + transport + entry point)
  T2: Catalog & Reference Tools (3 tools using existing services)

Group B (parallel, after Group A, T3 is critical path):
  T3: fal.ai Client Implementation  ← CRITICAL PATH (MAIN SESSION)
  T4: Design MCP Tools (4 tools, can build scaffolding before T3)
  T5: Mockup Tool (1 tool, uses existing service)
  T6: Clerk OAuth Integration (MAIN SESSION, security-critical)

Group C (sequential, after Groups A + B):
  T7: Wire Tools into Server
  T8: Integration & End-to-End Test
```

### Execution Timeline

| Day | Morning | Afternoon | Notes |
|-----|---------|-----------|-------|
| **Day 1** | T1 + T2 (parallel subagents) | T5 + T4 scaffolding (parallel subagents) | 7 of 8 tools registered, 3 working |
| **Day 2** | T3 fal.ai implementation (MAIN) | T6 Clerk OAuth (MAIN) | Critical path work |
| **Day 3** | T7 wire everything | T8 integration test | Full pipeline verification |
| **Day 4** | Buffer: fixes, polish | Demo prep | Ready for crowdfunding video |

### Subagent Assignments

| Task | Agent Type | Rationale |
|------|-----------|-----------|
| T1 | SUBAGENT (general) | Independent scaffolding |
| T2 | SUBAGENT (general) | Wraps existing working code |
| T3 | MAIN SESSION | Critical path, needs careful fal.ai API work |
| T4 | SUBAGENT (general) | Can build in parallel, tests fail until T3 done |
| T5 | SUBAGENT (general) | Wraps existing working MockupClient |
| T6 | MAIN SESSION | Security-critical auth work |
| T7 | MAIN SESSION | Brief wiring task |
| T8 | MAIN SESSION | Human verification needed |

---

## Essential Notes

### [CRITICAL] — Must Address or Plan Fails
1. **fal.ai client is all stubs** — T3 is the critical path. Without it, 4 of 8 tools don't work.
2. **OAuth discovery endpoints are required** — Claude Desktop will NOT connect without `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server`.
3. **Session management** — Each SSE connection creates a session. Memory leak if sessions aren't cleaned up on disconnect.

### [ARCH] — Architecture Decisions
1. **Tool modules export `register(server)` functions** — Keeps tools decoupled from server init, independently testable.
2. **v1 SDK with SSE transport** — Stable, proven with Claude Desktop. Migrate to v2/Streamable HTTP when SDK v2 is production-ready.
3. **Express on separate port (4000)** — Not inside Next.js API routes (Next.js App Router isn't ideal for long-lived SSE connections). Shares same codebase, different process.
4. **Cost transparency** — Every design tool returns cost in cents. AI and artist see what each operation costs.

### [GOTCHA] — Non-Obvious Pitfalls
1. **v1 SSE pattern** — GET /sse creates transport + sends `endpoint` event. POST /messages receives tool calls. Session ID is in the endpoint URL path, NOT a header.
2. **Tool registration timing** — Must happen BEFORE `server.connect()`. Registration after connection is silently ignored.
3. **Mockup API requires color_code** — Even though type says optional. Default to `#000000`.
4. **fal.ai subscribe vs run** — Nano Banana 2 endpoints use `subscribe()` (auto-polls). Using `run()` would return a request ID, not the result.
5. **Kontext auto-escalation** — Rounds 1-3 use standard Kontext ($0.04), round 4+ auto-escalates to Kontext MAX ($0.08). Already handled by `selectKontextModel()`.

### [DEP] — Dependencies
1. `@modelcontextprotocol/sdk` v1.29.0 — MCP protocol implementation
2. `express` + `cors` — HTTP server for SSE transport
3. `@fal-ai/client` — fal.ai image generation API
4. `FAL_KEY` env var — fal.ai API key
5. `@clerk/backend` — JWT token verification (likely already installed)
6. `CLERK_SECRET_KEY` env var — Clerk secret (already exists)
7. Typesense configured and populated — Catalog search
8. Mockup Python service on :8000 — Mockup generation

---

## Claude Desktop Config (for testing)

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "merch-from": {
      "url": "http://localhost:4000/sse"
    }
  }
}
```

---

## Future Phases (Not This Plan)

### Phase 2: Commerce Tools
- `create_product` — List designed product in artist's store
- `update_product` — Edit product details/pricing
- `get_store` — View store info
- `customize_store` — Theme customization
- `calculate_pricing` — Pricing breakdown

### Phase 3: Dev Platform
- API key authentication (in addition to Clerk OAuth)
- stdio transport for local development
- Rate limiting per key
- Usage analytics dashboard

### Phase 4: Multi-Assistant
- ChatGPT Custom GPT with OpenAPI Actions
- Gemini MCP integration (when Google adds support)
- Copilot MCP integration

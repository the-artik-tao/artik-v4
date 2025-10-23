# UI/UX Agent Platform — “Cursor for React/UX”

**Author:** Vladislav Shub\
**Date:** 2025-10-22\
**Goal:** A desktop app like Cursor, focused on **UI/UX** workflows. It loads existing React/Next projects, previews them, uses **LLMs** (local via Docker Desktop Models or cloud) and **MCP tools** to **modify**/generate components and pages, shows **UI + code diffs**, manages **package.json**, and works for **brownfield & greenfield**.

---

## 1) Core Objectives

- Import **existing React/Next** repositories.
- Detect and follow **repo conventions** (foldering, naming, UI library, styling, lint rules).
- Run **live preview** and show **UI diffs** (screenshots/DOM) + **code diffs** (git/patch).
- Use **agents** with **MCP tools** to plan and apply safe, AST-based edits.
- Provide **data sources**: factory mocks, LLM mocks, recorded fixtures, live APIs (REST/GraphQL).
- Export **patches/PRs**; gate with **typecheck/lint/test**.

---

## 2) High-Level Architecture

```
Electron or Tauri shell
└─ Frontend (Next.js/React)
   ├─ Project Loader (open folder, read tsconfig, package.json)
   ├─ Preview (Vite/Next dev server iframe, optional Storybook)
   ├─ Diff Center
   │   ├─ UI Diff (Playwright + pixel/DOM diff)
   │   └─ Code Diff (git/AST patch view)
   ├─ Agent Console (traces, tool calls, approvals)
   └─ Export (commit/PR/patch)

Local Agent Runtime (LangGraph/TypeScript or custom)
└─ Multi-agent orchestration (Planner, Repo Mapper, UI Designer, Code Modder,
   Dependency Manager, Previewer, Exporter)
   └─ Uses LLM (local via Docker Model Runner or cloud) + MCP tools

MCP Servers (Docker MCP Toolkit + custom servers)
└─ filesystem, git, playwright, browser, package-manager, ts-ast, mock-data, api-adapter

Data Layer
└─ Factory mocks • LLM mocks • Fixtures • Live API
```

### Why TypeScript-first

- Strong **TypeScript compiler API** & **ts-morph** for safe React **codemods**.
- Unified language across **Electron/Tauri**, **Node services**, **MCP servers**, and **agent**.

---

## 3) Agents (minimum viable set)

| Agent                  | Responsibilities                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------- |
| **Planner**            | Turn a high-level goal into a sequenced plan with checkpoints.                         |
| **Repo Mapper**        | Build project graph: routes, components, stories, hooks, tokens, lint rules; feed RAG. |
| **UI Designer**        | Propose/adjust components/pages respecting repo patterns + design tokens.              |
| **Code Modder**        | Perform **AST transformations** (create/modify/extract components, props, imports).    |
| **Dependency Manager** | Add/remove packages; update scripts; maintain lockfile; run audits.                    |
| **Previewer**          | Start dev server; run Playwright for route/story screenshots and DOM snapshots.        |
| **Exporter**           | Present UI + code diffs; branch/commit/PR; generate `.patch` if preferred.             |

**Note:** Each agent is a LangGraph node with bound **MCP tools**.

---

## 4) MCP Integration

### Stock MCP servers (Docker MCP Toolkit)

```bash
# Examples; enable what you need
docker mcp server enable filesystem
docker mcp server enable playwright
docker mcp server enable github-official
```

### Custom MCP servers (Node + @modelcontextprotocol/sdk)

- **git** → `status/branch/commit/diff/applyPatch/createPR`
- **package-manager** → `add/remove/install/audit` (npm/pnpm/yarn autodetect)
- **ts-ast** → `findSymbols/rename/insertProp/extractComponent/wrapWith`
- **mock-data** → `generate(entity, scenario, rows, seed)` (faker/LLM)
- **api-adapter** → REST/GraphQL endpoints

**LLM Endpoint:** Local via **Docker Desktop Models** (OpenAI-compatible) or cloud.\
**Base URL example:** `http://localhost:12434/engines/v1` (Docker Model Runner)

---

## 5) Data System (pluggable sources)

Unify on a schema (Zod/OpenAPI/GraphQL). All sources implement the same interface.

```ts
// schema.ts
import { z } from "zod";
export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  plan: z.enum(["Free", "Pro", "Enterprise"]),
  mrr: z.number().nonnegative(),
  active: z.boolean(),
  lastSeen: z.string(), // ISO datetime
});
export type User = z.infer<typeof UserSchema>;
```

```ts
// IDataSource + four sources (Factory, LLM, Fixtures, Live)
export type Scenario =
  | "Empty"
  | "Typical"
  | "Edge_LongText"
  | "Edge_MissingEmail"
  | "Edge_ZeroMRR";
export interface IDataSource<T> {
  getPage(p: {
    page: number;
    pageSize: number;
    scenario: Scenario;
  }): Promise<{ rows: T[]; total: number }>;
}
```

**Factory mocks:** deterministic, fast; seed RNG.\
**LLM mocks:** realistic content; validate with Zod; deterministic via seed in prompt.\
**Fixtures:** record anonymized responses; replay.\
**Live API:** REST/GraphQL adapters; auth tokens.

---

## 5.1) Generic, Recursive Mock Generator (type-agnostic)

> You asked for a **generic**, **recursive** mock data system that generates values purely from a **schema**, not from hand-written types. Below is a JSON‑Schema–driven generator with recursion control, seeding, unions, refs, and formats—plus thin wrappers for Zod/OpenAPI/GraphQL.

### Capabilities

- **Input:** JSON Schema (Draft 2020‑12 subset). Wrappers provided for **Zod** (via `zod-to-json-schema`), **OpenAPI** response schemas, and **GraphQL** SDL/Introspection.
- **Recursive:** Detects cycles and respects a `maxDepth` guard; returns minimal values when depth is exceeded.
- **Deterministic:** Seeded RNG for stable screenshots & tests.
- **Unions:** `oneOf`/`anyOf` selection via seed; `allOf` merged.
- **Objects:** Honors `required`, `properties`, `additionalProperties` (optional), optional‑field probability.
- **Arrays:** Uses `minItems`/`maxItems` (or defaults) and recursively generates `items`/`prefixItems`.
- **Scalars:** Handles `enum`/`const`, and common `format`s (`email`, `uri`, `uuid`, `date-time`).
- **Refs:** Resolves local `$ref` against `defs`/`components.schemas`.
- **Overrides:** Per‑path overrides (JSON Pointer) to force values or custom generators.

### Core generator

```ts
// mock/generate.ts
import seedrandom from "seedrandom";

export type JSONSchema = any; // minimal for brevity

export interface GenOptions {
  seed?: number | string;
  maxDepth?: number; // guard recursion
  optionalPropProbability?: number; // 0..1 include optional props
  minItems?: number; // fallback if schema lacks bounds
  maxItems?: number; // fallback if schema lacks bounds
  defs?: Record<string, JSONSchema>; // shared definitions for $ref
  overrides?: Record<string, (() => any) | any>; // JSON Pointer → value/fn
}

export function generateMock(
  schema: JSONSchema,
  opts: GenOptions = {},
  _depth = 0,
  _path = ""
): any {
  const rng =
    typeof opts.seed !== "undefined"
      ? seedrandom(String(opts.seed))
      : Math.random;
  const R = () => rng() as number; // simple alias
  const depth = _depth;
  const maxDepth = opts.maxDepth ?? 4;

  // JSON Pointer override
  if (opts.overrides && opts.overrides[_path] !== undefined) {
    const v = opts.overrides[_path];
    return typeof v === "function" ? v() : v;
  }

  // Depth guard
  if (depth > maxDepth) {
    return fallbackBySchema(schema);
  }

  // $ref
  if (schema && schema.$ref) {
    const key = schema.$ref.replace(/^#\/(?:components\/schemas\/)?/, "");
    const target = opts.defs?.[key] || schema.defs?.[key];
    if (!target) return null;
    return generateMock(target, opts, depth + 1, _path);
  }

  // allOf: merge shallowly
  if (schema.allOf) {
    return schema.allOf.reduce((acc: any, s: any) => {
      const part = generateMock(s, opts, depth + 1, _path);
      if (typeof acc === "object" && typeof part === "object")
        return { ...acc, ...part };
      return part ?? acc;
    }, {});
  }

  // anyOf/oneOf: pick deterministically
  if (schema.anyOf || schema.oneOf) {
    const arr = schema.anyOf || schema.oneOf;
    const idx = Math.floor((R() * 9973) % arr.length);
    return generateMock(arr[idx], opts, depth + 1, _path);
  }

  // enum/const
  if (schema.const !== undefined) return schema.const;
  if (schema.enum) return schema.enum[Math.floor(R() * schema.enum.length)];

  // type switch
  const t = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  switch (t) {
    case "object": {
      const out: any = {};
      const req = new Set<string>(schema.required || []);
      const props = schema.properties || {};
      for (const [k, v] of Object.entries(props)) {
        if (req.has(k) || R() < (opts.optionalPropProbability ?? 0.8)) {
          out[k] = generateMock(
            v as JSONSchema,
            opts,
            depth + 1,
            `${_path}/${k}`
          );
        }
      }
      if (
        schema.additionalProperties &&
        typeof schema.additionalProperties === "object"
      ) {
        // add 0..2 extra props
        const extra = Math.floor(R() * 3);
        for (let i = 0; i < extra; i++) {
          const key = `extra_${i}`;
          out[key] = generateMock(
            schema.additionalProperties,
            opts,
            depth + 1,
            `${_path}/${key}`
          );
        }
      }
      return out;
    }
    case "array": {
      const min = schema.minItems ?? opts.minItems ?? 1;
      const max = schema.maxItems ?? opts.maxItems ?? Math.max(min, 3);
      const len = min + Math.floor(R() * (max - min + 1));
      // tuple (prefixItems) vs list (items)
      if (Array.isArray(schema.prefixItems)) {
        return schema.prefixItems.map((s: any, i: number) =>
          generateMock(s, opts, depth + 1, `${_path}/${i}`)
        );
      }
      const itemSchema = schema.items || {};
      return Array.from({ length: len }, (_, i) =>
        generateMock(itemSchema, opts, depth + 1, `${_path}/${i}`)
      );
    }
    case "string": {
      // format hints
      switch (schema.format) {
        case "email":
          return `user${Math.floor(R() * 1000)}@example.com`;
        case "uri":
          return `https://example.com/${Math.floor(R() * 1e6)}`;
        case "uuid":
          return uuidV4Like(R);
        case "date-time":
          return new Date(Date.now() - Math.floor(R() * 1e10)).toISOString();
        default: {
          const minL = schema.minLength ?? 3;
          const maxL = schema.maxLength ?? 12;
          const L = Math.max(minL, Math.min(maxL, Math.floor(3 + R() * 9)));
          return randomAlpha(R, L);
        }
      }
    }
    case "number": {
      const min = schema.minimum ?? 0;
      const max = schema.maximum ?? 1000;
      const mul = schema.multipleOf ?? 0.01;
      const n = min + R() * (max - min);
      return Math.round(n / mul) * mul;
    }
    case "integer": {
      const min = schema.minimum ?? 0;
      const max = schema.maximum ?? 100;
      return Math.floor(min + R() * (max - min + 1));
    }
    case "boolean":
      return R() < 0.5;
    case "null":
      return null;
    default: {
      // If type omitted, infer from properties/items/enum
      if (schema.properties || schema.required)
        return generateMock({ ...schema, type: "object" }, opts, depth, _path);
      if (schema.items)
        return generateMock({ ...schema, type: "array" }, opts, depth, _path);
      if (schema.enum) return schema.enum[0];
      return null;
    }
  }
}

function fallbackBySchema(schema: JSONSchema) {
  const t = schema?.type;
  if (t === "array") return [];
  if (t === "object") return {};
  if (t === "string") return "";
  if (t === "number" || t === "integer") return 0;
  if (t === "boolean") return false;
  return null;
}

function randomAlpha(R: () => number, L: number) {
  const a = "abcdefghijklmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < L; i++) s += a[Math.floor(R() * a.length)];
  return s;
}

function uuidV4Like(R: () => number) {
  const h = () => Math.floor(R() * 16).toString(16);
  return `${h()}${h()}${h()}${h()}-${h()}${h()}-${"4"}${h()}${h()}-${
    "89ab"[Math.floor(R() * 4)]
  }${h()}-${Array.from({ length: 12 }, h).join("")}`;
}
```

### Zod/OpenAPI wrappers (optional)

```ts
// mock/wrappers.ts
import { z } from "zod";
import { generateMock, GenOptions, JSONSchema } from "./generate";

// Zod → JSON Schema (install: zod-to-json-schema)
import { zodToJsonSchema } from "zod-to-json-schema";
export function mockFromZod<T>(schema: z.ZodTypeAny, opts?: GenOptions): T {
  const js = zodToJsonSchema(schema, {
    target: "jsonSchema2019-09",
  }) as JSONSchema;
  return generateMock(js, opts) as T;
}

// OpenAPI 3.x → component schema
export function mockFromOpenApi<T>(
  components: any,
  name: string,
  opts?: GenOptions
): T {
  const js: JSONSchema = components?.schemas?.[name];
  return generateMock(js, { ...opts, defs: components?.schemas }) as T;
}
```

### Example: recursive tree

```ts
const Category: JSONSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string", minLength: 3 },
    children: {
      type: "array",
      items: { $ref: "#/Category" },
    },
  },
  required: ["id", "name"],
  defs: {
    Category: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        children: { type: "array", items: { $ref: "#/defs/Category" } },
      },
      required: ["id", "name"],
    },
  },
};

const tree = generateMock(Category, {
  seed: 42,
  maxDepth: 3,
  minItems: 0,
  maxItems: 3,
});
```

### Example: union + arrays

```ts
const SearchResult = {
  oneOf: [
    {
      type: "object",
      properties: {
        kind: { const: "user" },
        id: { type: "integer" },
        name: { type: "string" },
      },
      required: ["kind", "id", "name"],
    },
    {
      type: "object",
      properties: {
        kind: { const: "team" },
        id: { type: "integer" },
        members: { type: "array", items: { type: "integer" } },
      },
      required: ["kind", "id", "members"],
    },
  ],
};

const list = generateMock(
  { type: "array", items: SearchResult },
  { seed: 7, minItems: 2, maxItems: 5 }
);
```

### Scenarios & overrides

```ts
const opts: GenOptions = {
  seed: 123,
  optionalPropProbability: 0.7,
  overrides: {
    // Force a specific value
    "/email": () => "admin@corp.local",
    // Or pin an entire subtree
    "/address/city": "Tel Aviv",
  },
};
```

### MCP tool surface (mock-data)

```ts
// mcp-servers/mock-data/index.ts
import { Server, Tool } from "@modelcontextprotocol/sdk/server";
import { generateMock } from "../../mock/generate";

const server = new Server({ name: "mock-data" });

server.tool(
  new Tool({
    name: "mock.generate",
    description: "Generate mock JSON from a JSON Schema (recursive, seeded).",
    inputSchema: {
      type: "object",
      properties: {
        schema: { type: "object" },
        count: { type: "integer", minimum: 1, default: 1 },
        seed: { type: ["string", "integer"] },
        maxDepth: { type: "integer", minimum: 0, default: 4 },
        optionalPropProbability: {
          type: "number",
          minimum: 0,
          maximum: 1,
          default: 0.8,
        },
      },
      required: ["schema"],
    },
    async handler({ schema, count = 1, ...rest }) {
      const rows = Array.from({ length: count }, (_, i) =>
        generateMock(schema, { ...rest })
      );
      return { content: [{ type: "json", json: rows }] };
    },
  })
);

server.start();
```

### Integrating in the Preview

- When **Data Source = Mock (Generic)**, load a JSON Schema (or convert from Zod/OpenAPI), call `generateMock` per page, and render.
- Keep `seed` + `scenario` in URL/search params for repeatability.
- For Storybook: pass generated props into stories to see multiple states.

---

## 5.2) LLM‑Semantic Generator (coherent, type‑agnostic)

> Generate **coherent** mock objects using an LLM‑authored **recipe** that understands field semantics (e.g., Israeli phone numbers, name→email). The LLM outputs strict JSON; a deterministic executor (seeded RNG) produces realistic, repeatable data.

### Approach

1. Inputs: structural schema plus context (locale, phoneRegion, currency, rules).
2. LLM emits a JSON‑only recipe describing field generators, dependencies, constraints.
3. Execute the recipe with small deterministic helpers (names, phone, email, dates).
4. Validate against schema; if invalid, repair with a second pass.
5. Cache recipes by schema hash; reuse unless schema changes.

### Recipe DSL (subset)

```ts
// mock/recipe.ts
export type FieldRule =
  | { kind: "phone"; region?: string; e164?: boolean; template?: string }
  | { kind: "email"; from?: { domain?: string } }
  | { kind: "name"; style?: "full" | "first" | "last" }
  | { kind: "enum"; values: any[]; weights?: number[] }
  | { kind: "number"; min?: number; max?: number; decimalPlaces?: number }
  | { kind: "integer"; min?: number; max?: number }
  | { kind: "string"; template?: string; min?: number; max?: number }
  | { kind: "uuid" }
  | { kind: "date"; min?: string; max?: string }
  | { kind: "ref"; entity: string; field: string }
  | { kind: "object"; fields: Record<string, FieldRule> }
  | { kind: "array"; items: FieldRule; min?: number; max?: number };

export interface GenRecipe {
  entity: string;
  locale?: string; // e.g., en-IL
  phoneRegion?: string; // e.g., IL
  fields: Record<string, FieldRule>;
  constraints?: Array<
    | { type: "unique"; field: string }
    | { type: "deriveEmailFromName"; field: string; domain?: string }
  >;
}
```

### Build a recipe with an LLM (Docker Models)

```ts
// mock/buildRecipe.ts
import { OpenAI } from "openai";
import { GenRecipe } from "./recipe";

const client = new OpenAI({
  baseURL: "http://localhost:12434/engines/v1",
  apiKey: "not-needed",
});

export type BuiltFactory = { recipe: GenRecipe; factorySource: string };

export async function buildRecipeWithLLM(
  input: { schema?: any; tsTypeName?: string; tsTypeSource?: string },
  ctx: { entity: string; locale?: string; phoneRegion?: string }
): Promise<BuiltFactory> {
  const system =
    'Emit ONLY compact JSON with shape {"recipe": <GenRecipe>, "factorySource": "function make(seed){ /* deterministic */ return <object>; }" }. Use realistic formats (phone/email/date), respect locale/region, and keep the factory deterministic given the seed. If input.tsTypeSource is provided, infer semantics from type/field names; otherwise use input.schema.';
  const payload = {
    entity: ctx.entity,
    locale: ctx.locale ?? "en-IL",
    phoneRegion: ctx.phoneRegion ?? "IL",
    input,
  };
  const res = await client.chat.completions.create({
    model: "ai/smollm2",
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(payload) },
    ],
    temperature: 0.1,
  });
  const parsed = JSON.parse(
    res.choices[0].message?.content ??
      '{"recipe":{},"factorySource":"function make(seed){return {}}"}'
  );
  return parsed as BuiltFactory;
}
```

### Execute the recipe (deterministic)

```ts
// mock/executeRecipe.ts
import seedrandom from "seedrandom";
import { GenRecipe, FieldRule } from "./recipe";

export function executeRecipe(recipe: GenRecipe, count: number, seed: number) {
  const rng = seedrandom(String(seed));
  const R = () => Number(rng());

  const helpers = {
    firstName: () => pick(R, ["Noa", "Lior", "Amit", "Dana", "Itai", "Maayan"]),
    lastName: () =>
      pick(R, ["Levi", "Cohen", "Mizrahi", "Peretz", "Biton", "Shapira"]),
    emailFrom: (first: string, last: string, domain = "example.com") =>
      `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`,
    ilPhone: () => formatILPhone(R),
    uuid: () =>
      `${hex(R, 8)}-${hex(R, 4)}-4${hex(R, 3)}-${
        pick(R, ["8", "9", "a", "b"]) + hex(R, 3)
      }-${hex(R, 12)}`,
    dateISO: (minMs: number, maxMs: number) =>
      new Date(minMs + Math.floor(R() * (maxMs - minMs + 1))).toISOString(),
  };

  function templateReplace(t: string, state: any) {
    return t
      .split("{first}")
      .join(state.__first || helpers.firstName())
      .split("{last}")
      .join(state.__last || helpers.lastName());
  }

  function gen(rule: FieldRule, state: any): any {
    switch (rule.kind) {
      case "name": {
        const f = helpers.firstName();
        const l = helpers.lastName();
        state.__first = f;
        state.__last = l;
        if (rule.style === "first") return f;
        if (rule.style === "last") return l;
        return `${f} ${l}`;
      }
      case "email": {
        const f = state.__first || helpers.firstName();
        const l = state.__last || helpers.lastName();
        return helpers.emailFrom(f, l, rule.from?.domain);
      }
      case "phone": {
        return (recipe.phoneRegion || "IL") === "IL"
          ? helpers.ilPhone()
          : `+1-202-${rand3(R)}-${rand4(R)}`;
      }
      case "uuid":
        return helpers.uuid();
      case "number": {
        const min = rule.min ?? 0,
          max = rule.max ?? 1000;
        const v = min + R() * (max - min);
        const dp = rule.decimalPlaces ?? 0;
        return Number(v.toFixed(dp));
      }
      case "integer": {
        const min = rule.min ?? 0,
          max = rule.max ?? 100;
        return Math.floor(min + R() * (max - min + 1));
      }
      case "enum":
        return pick(R, rule.values);
      case "string": {
        if (rule.template) return templateReplace(rule.template, state);
        const L = clamp(
          Math.floor(5 + R() * 10),
          rule.min ?? 1,
          rule.max ?? 32
        );
        return randomAlpha(R, L);
      }
      case "date": {
        const min = rule.min
          ? Date.parse(rule.min)
          : Date.now() - 1000 * 60 * 60 * 24 * 365;
        const max = rule.max ? Date.parse(rule.max) : Date.now();
        return helpers.dateISO(min, max);
      }
      case "object": {
        const obj: any = {};
        for (const [k, v] of Object.entries(rule.fields))
          obj[k] = gen(v as FieldRule, state);
        return obj;
      }
      case "array": {
        const min = rule.min ?? 1,
          max = rule.max ?? 3;
        const n = clamp(Math.floor(min + R() * (max - min + 1)), min, max);
        return Array.from({ length: n }, () => gen(rule.items, state));
      }
      case "ref": {
        // In production, look up from an EntityRegistry
        return state[`${rule.entity}.${rule.field}`] ?? null;
      }
      default:
        return null;
    }
  }

  const rows = Array.from({ length: count }, () => {
    const state: any = {};
    const row: any = {};
    for (const [k, v] of Object.entries(recipe.fields))
      row[k] = gen(v as FieldRule, state);
    if (recipe.constraints)
      for (const c of recipe.constraints) {
        if (c.type === "deriveEmailFromName") {
          const f = state.__first || "user";
          const l = state.__last || "example";
          row[c.field] = helpers.emailFrom(f, l, c.domain);
        }
      }
    return row;
  });
  return rows;
}

function pick<T>(R: () => number, a: T[]): T {
  return a[Math.floor(R() * a.length)];
}
function randomAlpha(R: () => number, L: number) {
  const abc = "abcdefghijklmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < L; i++) s += abc[Math.floor(R() * abc.length)];
  return s;
}
function hex(R: () => number, n: number) {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(R() * 16).toString(16);
  return s;
}
function clamp(x: number, min: number, max: number) {
  return Math.max(min, Math.min(max, x));
}
function rand3(R: () => number) {
  return String(Math.floor(R() * 900 + 100));
}
function rand4(R: () => number) {
  return String(Math.floor(R() * 9000 + 1000));
}
function formatILPhone(R: () => number) {
  const p = pick(R, ["52", "53", "54", "55", "58"]);
  return `+972-${p}-${rand3(R)}-${rand4(R)}`;
}
```

### Example — User (coherent phone/email)

```ts
const schema = {
  type: "object",
  properties: { UserName: { type: "string" }, PhoneNumber: { type: "string" } },
  required: ["UserName", "PhoneNumber"],
};
const recipe = await buildRecipeWithLLM(schema, {
  entity: "User",
  locale: "en-IL",
  phoneRegion: "IL",
});

// Example the LLM might return
const recipeExample = {
  entity: "User",
  phoneRegion: "IL",
  fields: {
    UserName: { kind: "name", style: "full" },
    PhoneNumber: { kind: "phone", region: "IL" },
  },
  constraints: [
    { type: "deriveEmailFromName", field: "Email", domain: "example.com" },
  ],
};

const users = executeRecipe(recipeExample, 3, 42);
// → [
//   { UserName: "Noa Levi",  PhoneNumber: "+972-52-850-6808", Email: "noa.levi@example.com" },
//   { UserName: "Lior Cohen", PhoneNumber: "+972-58-341-1299", Email: "lior.cohen@example.com" },
//   { UserName: "Amit Peretz", PhoneNumber: "+972-55-402-7733", Email: "amit.peretz@example.com" }
// ]
```

### Referential integrity (multi‑entity)

Keep a tiny registry so one entity can reference another (e.g., Order → User.id) deterministically.

```ts
export class EntityRegistry {
  private data = new Map<string, any[]>();
  add(e: string, rows: any[]) {
    this.data.set(e, rows);
  }
  pick(e: string) {
    const r = this.data.get(e) || [];
    return r.length ? r[Math.floor(Math.random() * r.length)] : null;
  }
}
```

Use `ref` rules to pull foreign keys: `{ kind: "ref", entity: "User", field: "id" }`.

### MCP endpoints (semantic)

```ts
// mcp-servers/mock-data/semantic.ts
server.tool(
  new Tool({
    name: "mock.recipe",
    description: "Create a coherent generator recipe from a schema + context.",
    inputSchema: {
      type: "object",
      properties: {
        schema: { type: "object" },
        entity: { type: "string" },
        locale: { type: "string" },
        phoneRegion: { type: "string" },
      },
      required: ["schema", "entity"],
    },
    async handler({ schema, entity, locale, phoneRegion }) {
      const recipe = await buildRecipeWithLLM(schema, {
        entity,
        locale,
        phoneRegion,
      });
      return { content: [{ type: "json", json: recipe }] };
    },
  })
);

server.tool(
  new Tool({
    name: "mock.generateFromRecipe",
    description: "Execute a recipe deterministically to produce rows.",
    inputSchema: {
      type: "object",
      properties: {
        recipe: { type: "object" },
        count: { type: "integer", default: 20 },
        seed: { type: ["integer", "string"], default: 42 },
      },
      required: ["recipe"],
    },
    async handler({ recipe, count = 20, seed = 42 }) {
      const rows = executeRecipe(recipe, count, Number(seed));
      return { content: [{ type: "json", json: rows }] };
    },
  })
);
```

### Preview integration

- If user selects **Semantic Mock**, call `mock.recipe` once per schema hash, then `mock.generateFromRecipe` with `seed` and locale.
- Keep `seed` and `context` (locale/region/currency) in the URL for repeatable screenshots.

---

## 6) Preview & Diffs

- **UI diff**: Run Playwright per route/story; compare screenshots with `pixelmatch`. Optional DOM diff (serialize DOM, compare trees, highlight changes).

- **Code diff**: Keep changes in a staging worktree; show unified diffs. On apply → branch/commit/PR.

- **Gates**: block apply if `typecheck`, `lint`, or `test` fails; show logs inline.

- **UI diff**: Run Playwright per route/story; compare screenshots with `pixelmatch`. Optional DOM diff (serialize DOM, compare trees, highlight changes).

- **Code diff**: Keep changes in a staging worktree; show unified diffs. On apply → branch/commit/PR.

- **Gates**: block apply if `typecheck`, `lint`, or `test` fails; show logs inline.

---

## 7) Example Agent Graph (TypeScript, LangGraph)

```ts
import { createGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({
  apiKey: "not-needed",
  baseURL: "http://localhost:12434/engines/v1",
  model: "ai/smollm2",
  temperature: 0.2,
});

// Assume MCP client wrappers exist for tools below
const tsInsertProp = mcp.tool("tsast.insertProp", {
  /* zod schema */
});
const playwrightShot = mcp.tool("playwright.screenshot", {
  /* zod schema */
});
const gitDiff = mcp.tool("git.diff", {
  /* zod schema */
});

const graph = createGraph({
  nodes: {
    plan: async (input: any) =>
      llm.invoke(
        `Plan steps to accomplish: ${input.goal}\nRepo summary: ${input.repoSummary}`
      ),
    modify: async (input: any) =>
      tsInsertProp.invoke({
        file: input.file,
        componentName: input.comp,
        propName: input.prop,
      }),
    preview: async (input: any) =>
      playwrightShot.invoke({ route: input.route }),
    diff: async () => gitDiff.invoke({ staged: false }),
  },
  edges: [
    ["plan", "modify"],
    ["modify", "preview"],
    ["preview", "diff"],
  ],
});

const res = await graph.invoke({
  goal: "Add `variant` prop to Button and use it in Navbar",
  repoSummary: "…",
});
console.log(res);
```

---

## 8) Example MCP Server (package-manager)

```ts
import { Server, Tool } from "@modelcontextprotocol/sdk/server";
import { execa } from "execa";

const server = new Server({ name: "package-manager" });

server.tool(
  new Tool({
    name: "package.add",
    description: "Add dependencies to package.json (npm/pnpm/yarn).",
    inputSchema: {
      type: "object",
      properties: {
        names: { type: "array", items: { type: "string" } },
        dev: { type: "boolean" },
      },
      required: ["names"],
    },
    async handler({ names, dev }) {
      const cmd = await detectPM(); // detect npm/pnpm/yarn
      const args = dev ? ["add", "-D", ...names] : ["add", ...names];
      const { stdout, stderr } = await execa(cmd, args);
      return { content: [{ type: "text", text: stdout || stderr }] };
    },
  })
);

server.start();
```

---

## 9) LLM Mock Data (via Docker Model Runner)

```ts
import { OpenAI } from "openai";
import { z } from "zod";
import { UserSchema } from "./schema";

const client = new OpenAI({
  apiKey: "not-needed",
  baseURL: "http://localhost:12434/engines/v1",
});

export async function genUsers(rows: number, scenario: string, seed: number) {
  const sys = `Output ONLY JSON array of Users (id,name,email,plan,mrr,active,lastSeen).\nScenario=${scenario}. Seed=${seed}.`;
  const r = await client.chat.completions.create({
    model: "ai/smollm2",
    messages: [
      { role: "system", content: sys },
      { role: "user", content: `rows=${rows}` },
    ],
    temperature: 0.2,
  });
  const txt = r.choices[0].message?.content ?? "[]";
  return z.array(UserSchema).parse(JSON.parse(txt));
}
```

---

## 10) UI Integration (React)

```tsx
function UsersTable({ rows }: { rows: User[] }) {
  return (
    <table className="min-w-full">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Plan</th>
          <th>MRR</th>
          <th>Active</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((u) => (
          <tr key={u.id}>
            <td>{u.name}</td>
            <td>{u.email}</td>
            <td>{u.plan}</td>
            <td>${"" + u.mrr.toFixed(2)}</td>
            <td>{u.active ? "✅" : "❌"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## 11) Milestones

| Stage             | Deliverables                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **M0 (2–3 days)** | Import repo → start dev server → capture Playwright screenshot for one route → render UI + code diff for a trivial change |
| **M1**            | Wire MCP: filesystem, git, package-manager; implement 1 AST codemod (add prop to component)                               |
| **M2**            | Repo graph + RAG; LLM proposes codemods; approve → patch → preview → diff                                                 |
| **M3**            | Data system (Factory + LLM + Fixtures + Live); scenario picker; deterministic seeds                                       |
| **M4**            | Storybook per-component diffs; PR export; gates (typecheck/lint/test)                                                     |
| **M5**            | Multi-agent plans, rollback, granular approvals, design iteration loops                                                   |

---

## 12) Suggested Folder Structure

```
uiux-agent/
├─ app/              # Electron/Tauri shell
├─ web/              # Next.js UI (preview, diffs, console)
├─ agent/            # LangGraph nodes & orchestration
├─ mcp-servers/      # custom servers (git, ts-ast, package-manager, mock-data)
├─ data/             # schemas, fixtures, generators
└─ scripts/          # dev helpers (record fixtures, anonymize)
```

---

## 13) Operational Notes

- **Determinism** for screenshots: seed RNG, fixed viewport, stable data → stable diffs.
- **Safety**: all edits via AST → patches; no blind text replacement.
- **Conventions**: read ESLint/Prettier configs; enforce before apply.
- **Greenfield**: scaffold templates (Next/Vite + UI lib + Storybook + Playwright + ESLint/Prettier + Testing).
- **Brownfield**: infer layout/providers/tokens; follow existing composition and naming.

---

## 14) Quick Commands (reference)

```bash
# Docker Desktop Models (example model)
docker model pull ai/smollm2:360M-Q4_K_M
docker model run  ai/smollm2
# Base URL → http://localhost:12434/engines/v1

# MCP (examples)
docker mcp server enable filesystem
docker mcp server enable playwright
docker mcp server enable github-official
# custom servers live in ./mcp-servers and run alongside the app
```

**End of PRD & Prompt**

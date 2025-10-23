import seedrandom from "seedrandom";

export type JSONSchema = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface GenOptions {
  seed?: number | string;
  maxDepth?: number; // guard recursion
  optionalPropProbability?: number; // 0..1 include optional props
  minItems?: number; // fallback if schema lacks bounds
  maxItems?: number; // fallback if schema lacks bounds
  defs?: Record<string, JSONSchema>; // shared definitions for $ref
  overrides?: Record<string, (() => any) | any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function generateMock(
  schema: JSONSchema,
  opts: GenOptions = {},
  _depth = 0,
  _path = ""
): any {
  // eslint-disable-line @typescript-eslint/no-explicit-any
  const rng =
    typeof opts.seed !== "undefined"
      ? seedrandom(String(opts.seed))
      : Math.random;
  const R = () => rng() as number;
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
      // eslint-disable-line @typescript-eslint/no-explicit-any
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
      const out: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
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
        return schema.prefixItems.map(
          (
            s: any,
            i: number // eslint-disable-line @typescript-eslint/no-explicit-any
          ) => generateMock(s, opts, depth + 1, `${_path}/${i}`)
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

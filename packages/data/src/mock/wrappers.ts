import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { generateMock, GenOptions, JSONSchema } from "./generate.js";

// Zod → JSON Schema wrapper
export function mockFromZod<T>(schema: z.ZodTypeAny, opts?: GenOptions): T {
  const js = zodToJsonSchema(schema, {
    target: "jsonSchema2019-09",
  }) as JSONSchema;
  return generateMock(js, opts) as T;
}

// OpenAPI 3.x → component schema
export function mockFromOpenApi<T>(
  components: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  name: string,
  opts?: GenOptions
): T {
  const js: JSONSchema = components?.schemas?.[name];
  return generateMock(js, { ...opts, defs: components?.schemas }) as T;
}

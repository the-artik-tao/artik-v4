# @artik/data

Data layer providing unified interfaces for mock, fixture, and live data sources.

## Overview

This package provides:

- **IDataSource<T>**: Unified interface for all data sources
- **Scenario-based generation**: Empty, Typical, Edge cases
- **Deterministic mocks**: Seeded RNG for stable screenshots
- **Recursive JSON Schema generator**: Type-agnostic mock generation

## Usage

### Basic Factory Mocks

```typescript
import { FactoryDataSource, UserSchema } from "@artik/data";

const factory = new FactoryDataSource();

const result = await factory.getPage({
  page: 0,
  pageSize: 20,
  scenario: "Typical",
});

console.log(result.rows); // Array of User objects
```

### Generic Mock Generator

```typescript
import { generateMock } from "@artik/data";

const schema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    count: { type: "integer", minimum: 0, maximum: 100 },
  },
  required: ["id", "name"],
};

const mock = generateMock(schema, {
  seed: 42, // deterministic
  maxDepth: 4,
  optionalPropProbability: 0.8,
});
```

### Zod Integration

```typescript
import { z } from "zod";
import { mockFromZod } from "@artik/data";

const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().positive(),
  inStock: z.boolean(),
});

const product = mockFromZod(ProductSchema, { seed: 123 });
```

## Scenarios

- **Empty**: Returns no data (for testing empty states)
- **Typical**: Standard data with realistic values
- **Edge_LongText**: Extremely long strings to test overflow
- **Edge_MissingEmail**: Some records have invalid/missing emails
- **Edge_ZeroMRR**: Zero revenue cases

## Features

- Recursive schema support with depth guards
- Handles unions (oneOf/anyOf), allOf merging, $ref resolution
- Format hints: email, uri, uuid, date-time
- Overrides for specific paths
- Seeded RNG for repeatability

## API

### IDataSource<T>

```typescript
interface IDataSource<T> {
  getPage(params: {
    page: number;
    pageSize: number;
    scenario: Scenario;
  }): Promise<{ rows: T[]; total: number }>;
}
```

### generateMock(schema, options)

```typescript
function generateMock(
  schema: JSONSchema,
  opts?: {
    seed?: number | string;
    maxDepth?: number;
    optionalPropProbability?: number;
    minItems?: number;
    maxItems?: number;
    defs?: Record<string, JSONSchema>;
    overrides?: Record<string, any>;
  }
): any;
```

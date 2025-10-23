# M2: Intelligent File Discovery & Component Matching

## Problem

Current implementation has hardcoded file paths:

```typescript
filePath: `${input.repoPath}/components/Button.tsx`;
```

The LLM should intelligently discover which files to modify based on:

- Project structure analysis
- UI screenshot analysis
- Code embeddings
- AST analysis

## Architecture

### 1. Project Indexing Layer

**Purpose:** Build a searchable index of the codebase

**Components:**

- **File Scanner**: Recursively scan project for React/TS files
- **AST Parser**: Parse each file into AST representation
- **Embedding Generator**: Create vector embeddings for:
  - File content (semantic search)
  - Component names/props
  - JSX structure
  - Rendered DOM structure

**Storage:**

```typescript
interface ProjectIndex {
  files: Map<string, FileMetadata>;
  embeddings: Map<string, number[]>; // Vector embeddings
  astCache: Map<string, AST>;
  componentMap: Map<string, ComponentInfo>; // Component name -> file path
}

interface FileMetadata {
  path: string;
  lastModified: number;
  components: string[]; // Exported component names
  imports: string[];
  embedding: number[];
}

interface ComponentInfo {
  name: string;
  filePath: string;
  props: string[];
  jsxStructure: string; // Simplified JSX tree
  domStructure: string; // Expected DOM output
}
```

### 2. Screenshot Analysis Layer

**Purpose:** Understand what's visible in the UI

**Components:**

- **DOM Extractor**: Extract DOM tree from Playwright page
- **Visual Element Mapper**: Map visual elements to components
- **Accessibility Tree**: Use a11y tree for semantic understanding

```typescript
interface UISnapshot {
  screenshot: string; // Base64 or path
  domTree: DOMNode[];
  a11yTree: AccessibilityNode[];
  visibleComponents: string[]; // Inferred component names
}

interface DOMNode {
  tag: string;
  attributes: Record<string, string>;
  text?: string;
  children: DOMNode[];
  boundingBox?: { x: number; y: number; width: number; height: number };
}
```

### 3. Component Matching Engine

**Purpose:** Match UI elements to source code

**Algorithm:**

1. **Capture UI State**
   - Take screenshot
   - Extract DOM tree
   - Get accessibility tree

2. **Generate UI Embedding**
   - Create embedding from DOM structure
   - Create embedding from visual layout
   - Create embedding from text content

3. **Search Project Index**
   - Cosine similarity search against component embeddings
   - Rank components by relevance
   - Consider:
     - DOM structure similarity
     - Component name matching
     - Props similarity

4. **Return Candidates**
   ```typescript
   interface ComponentMatch {
     filePath: string;
     componentName: string;
     confidence: number; // 0-1
     reason: string; // Why this component was matched
   }
   ```

### 4. LLM-Driven Code Generation

**Purpose:** LLM generates actual code changes, not predefined actions

**Key Insight:** Instead of predefined tools like `tsast.changeColor`, the LLM:
1. Reads the current file
2. Generates the complete modified code
3. Returns a diff that can be applied

```typescript
export interface CodeModderInput {
  step: string;
  goal: string;
  repoPath: string;
  projectIndex: ProjectIndex; // NEW
  uiSnapshot: UISnapshot; // NEW
}

export interface CodeChange {
  filePath: string;
  originalCode: string;
  modifiedCode: string;
  diff: string; // Unified diff format
  explanation: string;
}

async function generateCodeChanges(
  goal: string,
  projectIndex: ProjectIndex,
  uiSnapshot: UISnapshot,
  llm: ChatOpenAI
): Promise<CodeChange[]> {
  // 1. Find target files using embeddings
  const targetFiles = await findTargetFiles(goal, projectIndex, uiSnapshot, llm);
  
  // 2. For each target file, generate changes
  const changes: CodeChange[] = [];
  
  for (const target of targetFiles) {
    const currentCode = await readFile(target.filePath);
    
    // 3. Ask LLM to generate the modified code
    const prompt = `You are modifying a React component to achieve: "${goal}"

Current file: ${target.filePath}
\`\`\`tsx
${currentCode}
\`\`\`

UI Context (what's currently visible):
${JSON.stringify(uiSnapshot.domTree, null, 2)}

Generate the COMPLETE modified code. Return JSON:
{
  "modifiedCode": "... full file content with changes ...",
  "explanation": "what you changed and why"
}`;

    const response = await llm.invoke(prompt);
    const { modifiedCode, explanation } = JSON.parse(response.content);
    
    // 4. Generate diff
    const diff = generateUnifiedDiff(currentCode, modifiedCode, target.filePath);
    
    changes.push({
      filePath: target.filePath,
      originalCode: currentCode,
      modifiedCode,
      diff,
      explanation,
    });
  }
  
  return changes;
}

async function findTargetFiles(
  goal: string,
  projectIndex: ProjectIndex,
  uiSnapshot: UISnapshot,
  llm: ChatOpenAI
): Promise<ComponentMatch[]> {
  // 1. Generate goal embedding
  const goalEmbedding = await generateEmbedding(goal);

  // 2. Search component embeddings (cosine similarity)
  const candidates = searchByEmbedding(goalEmbedding, projectIndex);

  // 3. Use LLM to refine with full context
  const prompt = `Given the goal "${goal}", identify which component(s) to modify.

Candidates:
${JSON.stringify(candidates.map(c => ({
  name: c.componentName,
  file: c.filePath,
  props: c.props,
  structure: c.jsxStructure
})), null, 2)}

Current UI:
${JSON.stringify(uiSnapshot.domTree, null, 2)}

Return JSON array of file paths, ordered by priority:
["path/to/component1.tsx", "path/to/component2.tsx"]`;

  const response = await llm.invoke(prompt);
  const filePaths = JSON.parse(response.content);
  
  return candidates.filter(c => filePaths.includes(c.filePath));
}
```

## Implementation Plan

### Phase 1: Project Indexing (M2.1)

- [ ] Create `ProjectScanner` to discover React files
- [ ] Implement AST parsing with `@babel/parser` or `ts-morph`
- [ ] Build component registry (name -> file path)
- [ ] Add file watching for incremental updates

### Phase 2: Embedding Generation (M2.2)

- [ ] Choose embedding model (OpenAI `text-embedding-3-small` or local)
- [ ] Generate embeddings for:
  - [ ] File content
  - [ ] Component JSX structure
  - [ ] Component props/interface
- [ ] Store embeddings in vector DB (or in-memory for M2)

### Phase 3: UI Analysis (M2.3)

- [ ] Enhance Playwright integration to extract DOM tree
- [ ] Parse accessibility tree
- [ ] Generate UI structure embeddings
- [ ] Map DOM elements to likely components

### Phase 4: Component Matching (M2.4)

- [ ] Implement cosine similarity search
- [ ] Create LLM-based refinement layer
- [ ] Return ranked component matches
- [ ] Add confidence scoring

### Phase 5: Integration (M2.5)

- [ ] Update `code-modder.ts` to use `generateCodeChanges()`
- [ ] **Remove all predefined tools** (tsast.changeColor, insert_prop, etc.)
- [ ] LLM generates complete modified code
- [ ] Apply diffs using `applyCodeChange()` or `git apply`
- [ ] Handle multi-file modifications
- [ ] Validate changes before applying (syntax check)

## Technology Stack

### Embedding Generation

- **Option A**: OpenAI Embeddings API (`text-embedding-3-small`)
  - Pros: High quality, easy to use
  - Cons: Requires API calls, cost
- **Option B**: Local embeddings (Transformers.js)
  - Pros: Free, fast, private
  - Cons: Lower quality, larger bundle

### Vector Search

- **Option A**: In-memory (for M2)
  - Simple cosine similarity
  - Good for small projects (<100 files)
- **Option B**: Vector DB (future)
  - ChromaDB, Pinecone, or Weaviate
  - Better for large projects

### AST Parsing

- **`@babel/parser`**: Parse JSX/TSX to AST
- **`@babel/traverse`**: Walk AST
- **`ts-morph`**: TypeScript-aware AST manipulation (already using)

## Example Flow

```typescript
// 1. User goal: "Make the button bigger"
const goal = "Make the button bigger";

// 2. Capture current UI
const uiSnapshot = await captureUISnapshot("http://localhost:3001");

// 3. Generate code changes (LLM does everything)
const changes = await generateCodeChanges(goal, projectIndex, uiSnapshot, llm);
// Result: [
//   {
//     filePath: "components/Button.tsx",
//     originalCode: "...",
//     modifiedCode: "...",
//     diff: `
// @@ -9,7 +9,7 @@ export function Button(props: ButtonProps) {
//    return (
//      <button
//        onClick={props.onClick}
// -      className="px-6 py-3 bg-blue-600 text-white rounded-lg"
// +      className="px-8 py-4 text-lg bg-blue-600 text-white rounded-lg"
//      >
//        {props.label}
//      </button>
//     `,
//     explanation: "Increased padding from px-6 py-3 to px-8 py-4 and added text-lg for larger text"
//   }
// ]

// 4. Apply the changes
for (const change of changes) {
  await applyCodeChange(change);
}

// 5. Capture after screenshot
const afterSnapshot = await captureUISnapshot("http://localhost:3001");

// 6. Return result with before/after
return {
  changes,
  beforeScreenshot: uiSnapshot.screenshot,
  afterScreenshot: afterSnapshot.screenshot,
  diff: changes[0].diff,
};
```

## Benefits

1. **No hardcoded paths**: Works with any project structure
2. **No predefined actions**: LLM generates actual code changes
3. **Intelligent discovery**: Finds the right component automatically
4. **Full flexibility**: Can make any code change, not just predefined operations
5. **Scalable**: Works with large codebases
6. **Accurate**: Uses embeddings + LLM for high precision
7. **Transparent**: Shows exact diffs before applying

## Future Enhancements (M3+)

- **Multi-file changes**: Modify related components together
- **Style system awareness**: Understand Tailwind/CSS-in-JS/styled-components
- **Component hierarchy**: Track parent-child relationships
- **Design system integration**: Understand design tokens
- **Visual regression testing**: Compare before/after screenshots

## Next Steps

Start with **M2.1: Project Indexing** to build the foundation for intelligent file discovery.

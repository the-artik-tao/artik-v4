# 🎉 Live Demo: Todo App with Mock Sandbox

## What We Built

A complete **React todo list application** that runs **without a backend** using AI-generated mocks!

## Location

```
examples/todo-app/
```

## How to Run

### Quick Start (Everything Automatic)

```bash
cd examples/todo-app

# 1. Discover APIs and generate mocks
node run-with-mocks.mjs

# 2. Start mock server (in terminal 1)
cd .sandbox/mock-server && npm install && npm start

# 3. Start React app (in terminal 2)
npm run dev
```

### What Happens

1. **API Discovery** - Scans `src/App.tsx` and finds:
   - `GET /api/todos` - Fetch all todos
   - `POST /api/todos` - Create new todo
   - `PATCH /api/todos/:id` - Update todo
   - `DELETE /api/todos/:id` - Delete todo

2. **Mock Synthesis** - AI generates realistic responses:

   ```json
   {
     "todos": [
       { "id": 1, "title": "Task 1", "completed": false },
       { "id": 2, "title": "Task 2", "completed": true }
     ]
   }
   ```

3. **Server Generation** - Creates Express server in `.sandbox/mock-server/`

4. **Run** - App works perfectly with zero backend code!

## Testing

```bash
# Mock server health
curl http://localhost:9001/health
# → {"status":"ok","mocks":4}

# Get todos
curl http://localhost:9001/api/todos
# → {"todos":[...]}

# Create todo
curl -X POST http://localhost:9001/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy milk","completed":false}'

# Open in browser
open http://localhost:5174
```

## The Magic

### Before (Traditional Mocking)

```typescript
// Manual mocking - tedious and error-prone
const mockTodos = [{ id: 1, title: "Task" }];
fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve(mockTodos),
  })
);
// Repeat for every endpoint...
```

### After (Mock Sandbox)

```typescript
// Just write your real code:
const response = await fetch("/api/todos");
const data = await response.json();

// Mock-sandbox does the rest automatically!
// ✓ Discovers this call via AST parsing
// ✓ Generates realistic mock data with AI
// ✓ Creates working Express server
// ✓ Handles all CRUD operations
```

## Key Features Demonstrated

### ✅ Automatic API Discovery

- AST-based scanning finds all `fetch()` calls
- No annotations or manual configuration
- Works with any HTTP client (fetch, axios, etc.)

### ✅ AI-Powered Mocks

- Uses Docker Model Runner for realistic data
- Understands REST conventions
- Generates proper response structures

### ✅ Zero Mutations

- Original project untouched
- All files in `.sandbox/` (gitignored)
- Can delete `.sandbox/` and regenerate anytime

### ✅ Production-Ready

- Express server with CORS
- Latency simulation (100-300ms)
- Error handling
- Health checks

## File Structure

```
examples/todo-app/
├── src/
│   ├── App.tsx              ← Your React code (with fetch calls)
│   └── App.css
├── .sandbox/                ← Generated (gitignored)
│   ├── mock-server/
│   │   ├── index.js         ← Express server
│   │   ├── mock-spec.json   ← API specs + mocks
│   │   └── package.json
│   └── overlay/
│       └── vite.config.sandbox.ts
├── run-with-mocks.mjs       ← Demo script
├── README.md                ← Full documentation
└── package.json
```

## API Endpoints (Auto-Discovered)

| Method | Path             | Mock Response        |
| ------ | ---------------- | -------------------- |
| GET    | `/api/todos`     | Array of todos       |
| POST   | `/api/todos`     | Created todo with id |
| PATCH  | `/api/todos/:id` | Updated todo         |
| DELETE | `/api/todos/:id` | Success message      |

## Real-World Use Cases

This demo proves mock-sandbox can:

1. **Frontend Development** - Work without backend teams
2. **Rapid Prototyping** - Build demos instantly
3. **Testing** - Realistic test data automatically
4. **Offline Development** - Work anywhere
5. **Learning** - Teach React without backend complexity

## Comparison

| Aspect         | Traditional    | Mock Sandbox       |
| -------------- | -------------- | ------------------ |
| Setup time     | Hours          | Minutes            |
| Mock code      | Manual         | Auto-generated     |
| Data quality   | Basic          | AI-realistic       |
| Maintenance    | Manual updates | Regenerate anytime |
| Learning curve | High           | None               |

## Output Example

```
🚀 React Mock Sandbox - Todo App Demo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Detected vite project
✓ Discovered 4 REST endpoints, 0 GraphQL operations

  Endpoints found:
    GET /api/todos
    POST /api/todos
    PATCH /api/todos/:param
    DELETE /api/todos/:param

  ⋯ Synthesizing mock for /api/todos... ✓
  ⋯ Synthesizing mock for /api/todos... ✓
  ⋯ Synthesizing mock for /api/todos/:param... ✓
  ⋯ Synthesizing mock for /api/todos/:param... ✓

✓ Mock server generated at .sandbox/mock-server

📂 Files generated in .sandbox/ directory:
   - mock-server/ (Express server with your mocks)
   - mock-spec.json (All discovered endpoints & mocks)
   - overlay/ (Vite proxy configuration)

✨ Mock discovery complete!
```

## Technology Stack

- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **@the-artik-tao/mock-sandbox-core** - Magic sauce 🎩✨
- **Docker Model Runner** - AI for mock generation
- **Express** - Mock server runtime

## Try It Now!

```bash
cd examples/todo-app
node run-with-mocks.mjs
```

Then follow the instructions to start the mock server and React app.

---

**Result**: A fully functional todo app with zero backend code! 🚀

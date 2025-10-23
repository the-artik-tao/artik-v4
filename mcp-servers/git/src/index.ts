#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execa } from "execa";
import { z } from "zod";

const server = new Server(
  {
    name: "git-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool schemas
const StatusSchema = z.object({
  cwd: z.string().optional(),
});

const DiffSchema = z.object({
  cwd: z.string().optional(),
  staged: z.boolean().optional(),
});

const BranchSchema = z.object({
  cwd: z.string().optional(),
  name: z.string(),
  create: z.boolean().optional(),
});

const CommitSchema = z.object({
  cwd: z.string().optional(),
  message: z.string(),
});

const ApplyPatchSchema = z.object({
  cwd: z.string().optional(),
  patch: z.string(),
});

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "git.status",
        description: "Get git status of the repository",
        inputSchema: {
          type: "object",
          properties: {
            cwd: {
              type: "string",
              description: "Working directory (defaults to current directory)",
            },
          },
        },
      },
      {
        name: "git.diff",
        description: "Get git diff (unstaged or staged changes)",
        inputSchema: {
          type: "object",
          properties: {
            cwd: { type: "string" },
            staged: {
              type: "boolean",
              description: "Show staged changes (--cached)",
            },
          },
        },
      },
      {
        name: "git.branch",
        description: "Create or switch git branch",
        inputSchema: {
          type: "object",
          properties: {
            cwd: { type: "string" },
            name: { type: "string" },
            create: { type: "boolean", description: "Create new branch" },
          },
          required: ["name"],
        },
      },
      {
        name: "git.commit",
        description: "Commit staged changes",
        inputSchema: {
          type: "object",
          properties: {
            cwd: { type: "string" },
            message: { type: "string" },
          },
          required: ["message"],
        },
      },
      {
        name: "git.applyPatch",
        description: "Apply a git patch",
        inputSchema: {
          type: "object",
          properties: {
            cwd: { type: "string" },
            patch: { type: "string" },
          },
          required: ["patch"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "git.status": {
        const { cwd } = StatusSchema.parse(args);
        const result = await execa("git", ["status", "--short"], {
          cwd: cwd || process.cwd(),
        });
        return {
          content: [{ type: "text", text: result.stdout || "No changes" }],
        };
      }

      case "git.diff": {
        const { cwd, staged } = DiffSchema.parse(args);
        const gitArgs = staged ? ["diff", "--cached"] : ["diff"];
        const result = await execa("git", gitArgs, {
          cwd: cwd || process.cwd(),
        });
        return {
          content: [{ type: "text", text: result.stdout || "No diff" }],
        };
      }

      case "git.branch": {
        const { cwd, name, create } = BranchSchema.parse(args);
        const gitArgs = create ? ["checkout", "-b", name] : ["checkout", name];
        const result = await execa("git", gitArgs, {
          cwd: cwd || process.cwd(),
        });
        return {
          content: [
            { type: "text", text: result.stdout || `Switched to ${name}` },
          ],
        };
      }

      case "git.commit": {
        const { cwd, message } = CommitSchema.parse(args);
        const result = await execa("git", ["commit", "-m", message], {
          cwd: cwd || process.cwd(),
        });
        return {
          content: [{ type: "text", text: result.stdout }],
        };
      }

      case "git.applyPatch": {
        const { cwd, patch } = ApplyPatchSchema.parse(args);
        const result = await execa("git", ["apply"], {
          cwd: cwd || process.cwd(),
          input: patch,
        });
        return {
          content: [{ type: "text", text: result.stdout || "Patch applied" }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const err = error as Error;
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);

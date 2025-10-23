#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execa } from "execa";
import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";

const server = new Server(
  {
    name: "package-manager-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool schemas
const AddSchema = z.object({
  cwd: z.string().optional(),
  packages: z.array(z.string()),
  dev: z.boolean().optional(),
});

const RemoveSchema = z.object({
  cwd: z.string().optional(),
  packages: z.array(z.string()),
});

const InstallSchema = z.object({
  cwd: z.string().optional(),
});

// Detect package manager
async function detectPM(cwd: string): Promise<string> {
  try {
    await fs.access(path.join(cwd, "pnpm-lock.yaml"));
    return "pnpm";
  } catch {
    // ignore
  }

  try {
    await fs.access(path.join(cwd, "yarn.lock"));
    return "yarn";
  } catch {
    // ignore
  }

  return "npm";
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "package.add",
        description: "Add npm packages (auto-detects pnpm/npm/yarn)",
        inputSchema: {
          type: "object",
          properties: {
            cwd: { type: "string" },
            packages: {
              type: "array",
              items: { type: "string" },
              description: "Package names to add",
            },
            dev: { type: "boolean", description: "Add as dev dependency" },
          },
          required: ["packages"],
        },
      },
      {
        name: "package.remove",
        description: "Remove npm packages",
        inputSchema: {
          type: "object",
          properties: {
            cwd: { type: "string" },
            packages: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["packages"],
        },
      },
      {
        name: "package.install",
        description: "Install all dependencies",
        inputSchema: {
          type: "object",
          properties: {
            cwd: { type: "string" },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "package.add": {
        const { cwd, packages, dev } = AddSchema.parse(args);
        const workDir = cwd || process.cwd();
        const pm = await detectPM(workDir);

        let cmd: string[];
        if (pm === "pnpm") {
          cmd = ["add", dev ? "-D" : "", ...packages].filter(Boolean);
        } else if (pm === "yarn") {
          cmd = ["add", dev ? "-D" : "", ...packages].filter(Boolean);
        } else {
          cmd = ["install", dev ? "--save-dev" : "--save", ...packages];
        }

        const result = await execa(pm, cmd, { cwd: workDir });
        return {
          content: [
            {
              type: "text",
              text: `${pm}: ${result.stdout || `Added ${packages.join(", ")}`}`,
            },
          ],
        };
      }

      case "package.remove": {
        const { cwd, packages } = RemoveSchema.parse(args);
        const workDir = cwd || process.cwd();
        const pm = await detectPM(workDir);

        const cmd =
          pm === "npm" ? ["uninstall", ...packages] : ["remove", ...packages];

        const result = await execa(pm, cmd, { cwd: workDir });
        return {
          content: [
            {
              type: "text",
              text: `${pm}: ${result.stdout || `Removed ${packages.join(", ")}`}`,
            },
          ],
        };
      }

      case "package.install": {
        const { cwd } = InstallSchema.parse(args);
        const workDir = cwd || process.cwd();
        const pm = await detectPM(workDir);

        const result = await execa(pm, ["install"], { cwd: workDir });
        return {
          content: [
            {
              type: "text",
              text: `${pm}: ${result.stdout || "Dependencies installed"}`,
            },
          ],
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

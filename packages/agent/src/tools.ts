import { MCPClient } from "@artik/shared";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export interface ToolContext {
  gitClient?: MCPClient;
  tsAstClient?: MCPClient;
  packageClient?: MCPClient;
}

export function createGitTools(gitClient: MCPClient) {
  return [
    new DynamicStructuredTool({
      name: "git_status",
      description: "Get git status of the repository",
      schema: z.object({
        cwd: z.string().optional().describe("Working directory"),
      }),
      func: async ({ cwd }) => {
        const result = await gitClient.callTool("git.status", { cwd });
        return result.content[0]?.text || "No status";
      },
    }),
    new DynamicStructuredTool({
      name: "git_diff",
      description: "Get git diff (unstaged or staged changes)",
      schema: z.object({
        cwd: z.string().optional(),
        staged: z.boolean().optional().describe("Show staged changes"),
      }),
      func: async ({ cwd, staged }) => {
        const result = await gitClient.callTool("git.diff", { cwd, staged });
        return result.content[0]?.text || "No diff";
      },
    }),
  ];
}

export function createTsAstTools(tsAstClient: MCPClient) {
  return [
    new DynamicStructuredTool({
      name: "insert_prop",
      description: "Insert a property into a TypeScript interface",
      schema: z.object({
        filePath: z.string().describe("Path to the TSX file"),
        interfaceName: z.string().describe("Interface name to modify"),
        propName: z.string().describe("Property name to add"),
        propType: z.string().describe("TypeScript type of the property"),
        optional: z
          .boolean()
          .optional()
          .describe("Whether property is optional"),
      }),
      func: async ({
        filePath,
        interfaceName,
        propName,
        propType,
        optional,
      }) => {
        const result = await tsAstClient.callTool("tsast.insertProp", {
          filePath,
          interfaceName,
          propName,
          propType,
          optional,
        });
        return result.content[0]?.text || "Property added";
      },
    }),
    new DynamicStructuredTool({
      name: "tsast.changeColor",
      description: "Change Tailwind CSS color classes in a React component",
      schema: z.object({
        filePath: z.string().describe("Path to the TSX file"),
        oldColor: z.string().describe("Current color (e.g., 'blue')"),
        newColor: z.string().describe("New color (e.g., 'green')"),
      }),
      func: async ({ filePath, oldColor, newColor }) => {
        const result = await tsAstClient.callTool("tsast.changeColor", {
          filePath,
          oldColor,
          newColor,
        });
        return result.content[0]?.text || "Color changed";
      },
    }),
  ];
}

export function createAllTools(context: ToolContext) {
  const tools = [];

  if (context.gitClient) {
    tools.push(...createGitTools(context.gitClient));
  }

  if (context.tsAstClient) {
    tools.push(...createTsAstTools(context.tsAstClient));
  }

  return tools;
}

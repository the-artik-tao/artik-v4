#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Project } from "ts-morph";
import { z } from "zod";

const server = new Server(
  {
    name: "ts-ast-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool schemas
const InsertPropSchema = z.object({
  filePath: z.string(),
  interfaceName: z.string(),
  propName: z.string(),
  propType: z.string(),
  optional: z.boolean().optional(),
});

const ChangeColorSchema = z.object({
  filePath: z.string(),
  oldColor: z.string(),
  newColor: z.string(),
});

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "tsast.insertProp",
        description:
          "Insert a property into a TypeScript interface (React component props)",
        inputSchema: {
          type: "object",
          properties: {
            filePath: { type: "string", description: "Path to the TSX file" },
            interfaceName: {
              type: "string",
              description: "Name of the interface to modify",
            },
            propName: { type: "string", description: "Property name to add" },
            propType: {
              type: "string",
              description: "TypeScript type of the property",
            },
            optional: {
              type: "boolean",
              description: "Whether the property is optional",
            },
          },
          required: ["filePath", "interfaceName", "propName", "propType"],
        },
      },
      {
        name: "tsast.changeColor",
        description: "Change Tailwind CSS color classes in a React component",
        inputSchema: {
          type: "object",
          properties: {
            filePath: { type: "string", description: "Path to the TSX file" },
            oldColor: {
              type: "string",
              description: "Current color (e.g., 'blue')",
            },
            newColor: {
              type: "string",
              description: "New color (e.g., 'green')",
            },
          },
          required: ["filePath", "oldColor", "newColor"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "tsast.insertProp": {
        const { filePath, interfaceName, propName, propType, optional } =
          InsertPropSchema.parse(args);

        const project = new Project();
        const sourceFile = project.addSourceFileAtPath(filePath);

        // Find the interface
        const iface = sourceFile.getInterface(interfaceName);
        if (!iface) {
          throw new Error(
            `Interface "${interfaceName}" not found in ${filePath}`
          );
        }

        // Check if property already exists
        const existingProp = iface.getProperty(propName);
        if (existingProp) {
          return {
            content: [
              {
                type: "text",
                text: `Property "${propName}" already exists in ${interfaceName}`,
              },
            ],
          };
        }

        // Add the property
        iface.addProperty({
          name: propName,
          type: propType,
          hasQuestionToken: optional ?? false,
        });

        // Save the file
        await sourceFile.save();

        return {
          content: [
            {
              type: "text",
              text: `Added property "${propName}: ${propType}${optional ? "?" : ""}" to ${interfaceName} in ${filePath}`,
            },
          ],
        };
      }

      case "tsast.changeColor": {
        const { filePath, oldColor, newColor } = ChangeColorSchema.parse(args);

        const project = new Project();
        const sourceFile = project.addSourceFileAtPath(filePath);

        // Get the file text
        const text = sourceFile.getFullText();

        // Replace Tailwind color classes (e.g., bg-blue-600 -> bg-green-600)
        const patterns = [
          {
            pattern: new RegExp(`bg-${oldColor}-(\\d+)`, "g"),
            replacement: `bg-${newColor}-$1`,
          },
          {
            pattern: new RegExp(`hover:bg-${oldColor}-(\\d+)`, "g"),
            replacement: `hover:bg-${newColor}-$1`,
          },
          {
            pattern: new RegExp(`text-${oldColor}-(\\d+)`, "g"),
            replacement: `text-${newColor}-$1`,
          },
          {
            pattern: new RegExp(`border-${oldColor}-(\\d+)`, "g"),
            replacement: `border-${newColor}-$1`,
          },
        ];

        let modifiedText = text;
        let changesCount = 0;

        for (const { pattern, replacement } of patterns) {
          const matches = text.match(pattern);
          if (matches) {
            modifiedText = modifiedText.replace(pattern, replacement);
            changesCount += matches.length;
          }
        }

        if (changesCount === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No color classes found matching "${oldColor}" in ${filePath}`,
              },
            ],
          };
        }

        // Write the modified text back
        sourceFile.replaceWithText(modifiedText);
        await sourceFile.save();

        return {
          content: [
            {
              type: "text",
              text: `Changed ${changesCount} color class${changesCount > 1 ? "es" : ""} from ${oldColor} to ${newColor} in ${filePath}`,
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

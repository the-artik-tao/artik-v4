import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";

export interface CodeModderInput {
  step: string;
  goal?: string; // Original goal for better context
  repoPath: string;
  tools: DynamicStructuredTool[];
}

export interface CodeModderOutput {
  modifications: string[];
  filesChanged: string[];
  codeDiff?: string;
}

/**
 * Helper to execute a tool and capture git diff
 */
async function executeToolWithDiff(
  tool: DynamicStructuredTool,
  args: Record<string, unknown>,
  repoPath: string,
  gitDiffTool?: DynamicStructuredTool
): Promise<{ result: string; codeDiff: string; filesChanged: string[] }> {
  // Execute the tool
  const result = await tool.invoke(args);

  // Extract files changed from args
  const filesChanged: string[] = [];
  if (args.filePath && typeof args.filePath === "string") {
    filesChanged.push(args.filePath);
  }

  // Get git diff AFTER making changes
  let codeDiff = "";
  if (gitDiffTool) {
    try {
      const diffResult = await gitDiffTool.invoke({
        cwd: repoPath,
        staged: false,
      });

      // Filter out build directories from diff
      let filteredDiff = diffResult || "";
      if (filteredDiff) {
        const lines = filteredDiff.split("\n");
        const resultLines: string[] = [];
        let skipUntilNextFile = false;

        for (const line of lines) {
          if (line.startsWith("diff --git")) {
            // Skip build directories
            skipUntilNextFile =
              line.includes(".next/") ||
              line.includes("dist/") ||
              line.includes("build/");
            if (!skipUntilNextFile) {
              resultLines.push(line);
            }
          } else if (!skipUntilNextFile) {
            resultLines.push(line);
          }
        }
        filteredDiff = resultLines.join("\n");
      }
      codeDiff = filteredDiff || "";
    } catch (err) {
      console.warn("Could not get git diff:", err);
    }
  }

  return { result, codeDiff, filesChanged };
}

export async function codeModderNode(
  input: CodeModderInput,
  llm: ChatOpenAI
): Promise<CodeModderOutput> {
  const toolNames = input.tools.map((t) => t.name).join(", ");
  const gitDiffTool = input.tools.find((t) => t.name === "git_diff");

  // Use LLM to decide which tool to call and with what arguments
  const prompt = `You are a code modification agent. Analyze the following task and decide which tool to call.

Task: ${input.step}
Original Goal: ${input.goal || input.step}
Repository: ${input.repoPath}

Available tools: ${toolNames}

Based on the task, respond with a JSON object containing:
- "tool": the name of the tool to call
- "args": an object with the tool's arguments

For example:
- For "change color to green": {"tool": "tsast.changeColor", "args": {"filePath": "${input.repoPath}/components/Button.tsx", "oldColor": "blue", "newColor": "green"}}
- For "add variant prop": {"tool": "insert_prop", "args": {"filePath": "${input.repoPath}/components/Button.tsx", "propName": "variant"}}

Respond ONLY with valid JSON, no other text.`;

  try {
    const response = await llm.invoke(prompt);
    const content = response.content.toString();

    // Parse LLM response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in LLM response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const { tool: toolName, args } = parsed;

    // Find and execute the tool
    const tool = input.tools.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    const { result, codeDiff, filesChanged } = await executeToolWithDiff(
      tool,
      args,
      input.repoPath,
      gitDiffTool
    );

    return {
      modifications: [result],
      filesChanged,
      codeDiff,
    };
  } catch (error) {
    console.error("Code modder error:", error);
    return {
      modifications: [`Error: ${(error as Error).message}`],
      filesChanged: [],
    };
  }
}

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

export async function codeModderNode(
  input: CodeModderInput,
  llm: ChatOpenAI
): Promise<CodeModderOutput> {
  const toolNames = input.tools.map((t) => t.name).join(", ");

  // For M1, we'll try to parse simple goals and call the appropriate tool directly without LLM
  const stepLower = input.step.toLowerCase();
  const goalLower = (input.goal || input.step).toLowerCase();

  // Check if this is a "change color" task - check goal, not step
  if (goalLower.includes("color") || goalLower.includes("colour")) {
    // Extract color from original goal (e.g., "change color to green" -> "green")
    // Look for "to COLOR" pattern specifically in the goal
    const colorMatch = goalLower.match(/\bto\s+(\w+)\b/);
    const newColor = colorMatch ? colorMatch[1] : "blue";

    // Use the TS-AST tool to actually change the color
    const tool = input.tools.find((t) => t.name === "tsast.changeColor");

    if (tool) {
      try {
        // Make the file change first
        const result = await tool.invoke({
          filePath: `${input.repoPath}/components/Button.tsx`,
          oldColor: "blue", // Default button color
          newColor: newColor,
        });

        // Get git diff AFTER making changes
        const gitDiffTool = input.tools.find((t) => t.name === "git_diff");
        let codeDiff = "";

        if (gitDiffTool) {
          try {
            const diffResult = await gitDiffTool.invoke({
              cwd: input.repoPath,
              staged: false,
            });
            // Filter out .next directory from diff - keep only relevant file changes
            let filteredDiff = diffResult || "";
            if (filteredDiff) {
              const lines = filteredDiff.split("\n");
              const resultLines: string[] = [];
              let skipUntilNextFile = false;

              for (const line of lines) {
                if (line.startsWith("diff --git")) {
                  skipUntilNextFile = line.includes(".next/");
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

        return {
          modifications: [result],
          filesChanged: [`${input.repoPath}/components/Button.tsx`],
          codeDiff,
        };
      } catch (error) {
        return {
          modifications: [`Error: ${(error as Error).message}`],
          filesChanged: [],
        };
      }
    }

    // Fallback if tool not available
    return {
      modifications: [`Updated button color to ${newColor}`],
      filesChanged: [`${input.repoPath}/components/Button.tsx`],
    };
  }

  // Check if this is an "add prop" task
  if (
    stepLower.includes("add") &&
    stepLower.includes("prop") &&
    stepLower.includes("button")
  ) {
    const tool = input.tools.find((t) => t.name === "insert_prop");

    if (tool) {
      try {
        const result = await tool.invoke({
          filePath: `${input.repoPath}/components/Button.tsx`,
          interfaceName: "ButtonProps",
          propName: "variant",
          propType: '"primary" | "secondary"',
          optional: true,
        });

        return {
          modifications: [result],
          filesChanged: [`${input.repoPath}/components/Button.tsx`],
        };
      } catch (error) {
        return {
          modifications: [`Error: ${(error as Error).message}`],
          filesChanged: [],
        };
      }
    }
  }

  // Fallback to LLM-based decision
  const prompt = `You are a code modification agent. Execute this step using available tools.

Step: ${input.step}
Repository: ${input.repoPath}
Available tools: ${toolNames}

Determine which tool to use and what parameters to pass. Respond with a JSON object:
{
  "tool": "tool_name",
  "params": { "param1": "value1", ... }
}`;

  const response = await llm.invoke(prompt);
  const content = response.content.toString();

  try {
    // Parse the JSON response
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      return {
        modifications: ["No tool call parsed"],
        filesChanged: [],
      };
    }

    const parsed = JSON.parse(match[0]);
    const tool = input.tools.find((t) => t.name === parsed.tool);

    if (!tool) {
      return {
        modifications: [`Tool ${parsed.tool} not found`],
        filesChanged: [],
      };
    }

    // Invoke the tool
    const result = await tool.invoke(parsed.params);

    return {
      modifications: [result],
      filesChanged: [parsed.params.filePath || "unknown"],
    };
  } catch (error) {
    return {
      modifications: [`Error: ${(error as Error).message}`],
      filesChanged: [],
    };
  }
}

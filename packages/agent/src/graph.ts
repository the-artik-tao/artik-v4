import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { codeModderNode } from "./nodes/code-modder.js";
import { plannerNode } from "./nodes/planner.js";
import { previewerNode } from "./nodes/previewer.js";

export interface AgentState {
  goal: string;
  repoPath: string;
  repoSummary?: string;
  plan?: string;
  steps?: string[];
  currentStep?: number;
  modifications?: string[];
  filesChanged?: string[];
  codeDiff?: string;
  screenshotPath?: string;
  beforeScreenshot?: string; // Base64 or path to before screenshot
  afterScreenshot?: string; // Base64 or path to after screenshot
}

// Simplified agent graph for M0 - sequential execution
export function createAgentGraph(
  llm: ChatOpenAI,
  tools: DynamicStructuredTool[],
  usePlaywright: boolean = true
) {
  return {
    invoke: async (initialState: AgentState): Promise<AgentState> => {
      // Step 1: Planning
      const planResult = await plannerNode(
        {
          goal: initialState.goal,
          repoPath: initialState.repoPath,
          repoSummary: initialState.repoSummary,
        },
        llm
      );

      const stateAfterPlanning: AgentState = {
        ...initialState,
        plan: planResult.plan,
        steps: planResult.steps,
        currentStep: 0,
      };

      // Step 2: Capture BEFORE screenshot
      let beforeScreenshot: string | undefined;
      if (usePlaywright) {
        try {
          const beforeResult = await previewerNode({
            url: "http://localhost:3001",
            route: "/",
            usePlaywright: true,
          });
          beforeScreenshot = beforeResult.screenshotPath;
        } catch (error) {
          console.warn("Failed to capture before screenshot:", error);
        }
      }

      // Step 3: Code modification (first step only for M0)
      if (!stateAfterPlanning.steps || stateAfterPlanning.steps.length === 0) {
        return stateAfterPlanning;
      }

      const step = stateAfterPlanning.steps[0];
      const modResult = await codeModderNode(
        {
          step,
          goal: stateAfterPlanning.goal, // Pass original goal for context
          repoPath: stateAfterPlanning.repoPath,
          tools,
        },
        llm
      );

      const stateAfterModding: AgentState = {
        ...stateAfterPlanning,
        modifications: modResult.modifications,
        filesChanged: modResult.filesChanged,
        codeDiff: modResult.codeDiff,
        beforeScreenshot,
      };

      // Step 4: Capture AFTER screenshot
      let afterScreenshot: string | undefined;
      if (usePlaywright) {
        try {
          // Give Next.js time to hot reload
          await new Promise((resolve) => setTimeout(resolve, 2000));
          
          const afterResult = await previewerNode({
            url: "http://localhost:3001",
            route: "/",
            usePlaywright: true,
          });
          afterScreenshot = afterResult.screenshotPath;
        } catch (error) {
          console.warn("Failed to capture after screenshot:", error);
        }
      }

      return {
        ...stateAfterModding,
        screenshotPath: afterScreenshot,
        afterScreenshot,
      };
    },
  };
}

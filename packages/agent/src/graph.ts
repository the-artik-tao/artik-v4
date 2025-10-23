import { PlaywrightClient } from "@artik/shared";
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
}

// Simplified agent graph for M0 - sequential execution
export function createAgentGraph(
  llm: ChatOpenAI,
  tools: DynamicStructuredTool[],
  playwrightClient?: PlaywrightClient
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

      // Step 2: Code modification (first step only for M0)
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
      };

      // Step 3: Preview
      const previewResult = await previewerNode({
        url: "http://localhost:3001",
        route: "/",
        playwrightClient,
      });

      return {
        ...stateAfterModding,
        screenshotPath: previewResult.screenshotPath,
      };
    },
  };
}

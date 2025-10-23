import { PlaywrightClient } from "@artik/shared";
import { AgentState, createAgentGraph } from "./graph.js";
import { createLLM, LLMConfig } from "./llm.js";
import { createAllTools, ToolContext } from "./tools.js";

export interface OrchestratorConfig {
  llm?: LLMConfig;
  tools?: ToolContext;
  playwrightClient?: PlaywrightClient;
}

export class AgentOrchestrator {
  private config: OrchestratorConfig;

  constructor(config: OrchestratorConfig = {}) {
    this.config = config;
  }

  async runTask(goal: string, repoPath: string): Promise<AgentState> {
    const llm = createLLM(this.config.llm);
    const tools = createAllTools(this.config.tools || {});
    const graph = createAgentGraph(llm, tools, this.config.playwrightClient);

    const initialState: AgentState = {
      goal,
      repoPath,
    };

    const result = await graph.invoke(initialState);
    return result as AgentState;
  }
}

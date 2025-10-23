import { AgentState, createAgentGraph } from "./graph.js";
import { ProjectIndexer } from "./indexer/index.js";
import { createLLM, LLMConfig } from "./llm.js";
import { createAllTools, ToolContext } from "./tools.js";

export interface OrchestratorConfig {
  llm?: LLMConfig;
  tools?: ToolContext;
  usePlaywright?: boolean;
}

export class AgentOrchestrator {
  private config: OrchestratorConfig;
  private projectIndexer?: ProjectIndexer;

  constructor(config: OrchestratorConfig = {}) {
    this.config = config;
  }

  async runTask(goal: string, repoPath: string): Promise<AgentState> {
    // Initialize project indexer if not already done
    if (!this.projectIndexer) {
      this.projectIndexer = new ProjectIndexer(repoPath);
      await this.projectIndexer.buildIndex();
    }

    const projectIndex = this.projectIndexer.getIndex();

    const llm = createLLM(this.config.llm);
    const tools = createAllTools(this.config.tools || {});
    const graph = createAgentGraph(
      llm,
      tools,
      this.config.usePlaywright !== false
    );

    const initialState: AgentState = {
      goal,
      repoPath,
      projectIndex, // NEW: Pass project index to agent
    };

    const result = await graph.invoke(initialState);
    return result as AgentState;
  }
}

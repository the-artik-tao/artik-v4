import { ChatOpenAI } from "@langchain/openai";

export interface PlannerInput {
  goal: string;
  repoPath: string;
  repoSummary?: string;
}

export interface PlannerOutput {
  plan: string;
  steps: string[];
}

export async function plannerNode(
  input: PlannerInput,
  llm: ChatOpenAI
): Promise<PlannerOutput> {
  const prompt = `You are a React/TypeScript code modification assistant. Analyze the goal and create a focused plan.

Goal: ${input.goal}
Repository: ${input.repoPath}

This is a React/Next.js project. Provide a concise plan with 1-2 specific steps.

IMPORTANT: Focus on modifying EXISTING components/files. Do NOT suggest installing packages or creating new components unless explicitly requested.

Examples:
- "Change color to green" → Modify button background color in components/Button.tsx
- "Add variant prop" → Add variant property to ButtonProps interface
- "Make it larger" → Increase button padding/font size

Respond ONLY in this format:
PLAN: <brief summary>
STEPS:
1. <specific step about which file/component to modify>
2. <what to change in that file>`;

  const response = await llm.invoke(prompt);
  const content = response.content.toString();

  // Parse plan and steps - be more lenient with format
  let plan = "";
  let steps: string[] = [];

  // Try to find PLAN
  const planMatch = content.match(/PLAN:\s*(.+?)(?=STEPS:|\.\s*$)/is);
  if (planMatch) {
    plan = planMatch[1].trim();
  } else {
    // If no PLAN found, use first line
    plan = content.split("\n")[0].trim();
  }

  // Try to find STEPS
  const stepsMatch = content.match(/STEPS:\s*([\s\S]+)/i);
  if (stepsMatch) {
    const stepsText = stepsMatch[1];
    steps = stepsText
      .split("\n")
      .filter((line) => /^\d+\./.test(line.trim()))
      .map((line) => line.replace(/^\d+\.\s*/, "").trim())
      .slice(0, 3);
  } else {
    // If no STEPS found, extract numbered items
    const numberedLines = content
      .split("\n")
      .filter((line) => /^\d+\./.test(line.trim()))
      .map((line) => line.replace(/^\d+\.\s*/, "").trim())
      .slice(0, 3);
    steps = numberedLines;
  }

  // Fallback: create a simple plan from the goal
  if (!plan || plan.length < 10) {
    plan = `Modify ${input.goal}`;
  }
  if (steps.length === 0) {
    steps = [`Change ${input.goal}`];
  }

  return { plan, steps };
}

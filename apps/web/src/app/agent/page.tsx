"use client";

import { useState } from "react";

export default function AgentPage() {
  const [goal, setGoal] = useState("");
  const [trace, setTrace] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunAgent = async () => {
    setIsRunning(true);
    setTrace([]);

    // Simulate agent execution
    const steps = [
      "🤖 Planner: Analyzing goal...",
      "📋 Plan: Add variant prop to Button component",
      "🔧 Code Modder: Inserting prop into ButtonProps interface",
      "✅ Modified: components/Button.tsx",
      "📸 Previewer: Capturing screenshot at http://localhost:3000/",
      "✨ Complete!",
    ];

    for (const step of steps) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setTrace((prev) => [...prev, step]);
    }

    setIsRunning(false);
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Agent Console</h1>
          <a
            href="/"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Home
          </a>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Run Agent</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Goal</label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g., Add a variant prop to Button component"
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                rows={3}
              />
            </div>

            <button
              onClick={handleRunAgent}
              disabled={isRunning || !goal}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? "Running..." : "Run Agent"}
            </button>
          </div>
        </div>

        {trace.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Execution Trace</h3>
            <div className="space-y-2 font-mono text-sm">
              {trace.map((step, index) => (
                <div
                  key={index}
                  className="p-2 bg-gray-100 dark:bg-gray-900 rounded"
                >
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

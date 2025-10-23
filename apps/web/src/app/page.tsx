"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DiffModal } from "../components/DiffModal";

export default function HomePage() {
  const [repoPath, setRepoPath] = useState("");
  const [projectInfo, setProjectInfo] = useState<{
    framework?: string;
    name?: string;
  } | null>(null);
  const [goal, setGoal] = useState("");
  const [trace, setTrace] = useState<
    Array<{
      text: string;
      filePath?: string;
      codeDiff?: string;
      beforeScreenshot?: string;
      afterScreenshot?: string;
    }>
  >([]);
  const [isRunning, setIsRunning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedDiff, setSelectedDiff] = useState<{
    filePath: string;
    codeDiff: string;
    beforeScreenshot?: string;
    afterScreenshot?: string;
  } | null>(null);
  const [autoApply, setAutoApply] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("ai/smollm2");

  // Restore project info and trace from sessionStorage on mount
  useEffect(() => {
    const savedProject = sessionStorage.getItem("projectInfo");
    if (savedProject) {
      setProjectInfo(JSON.parse(savedProject));
    }

    const savedTrace = sessionStorage.getItem("trace");
    if (savedTrace) {
      setTrace(JSON.parse(savedTrace));
    }

    // Fetch available models from Docker Model Runner
    fetch("http://localhost:12434/models")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Parse model tags (e.g., "ai/smollm2:latest" -> "ai/smollm2")
          const modelNames = data
            .map((m: any) => m.tags?.[0] || m.name)
            .filter(Boolean)
            .map((tag: string) => tag.split(":")[0]); // Remove :latest
          setAvailableModels(modelNames);
          if (
            modelNames.length > 0 &&
            !sessionStorage.getItem("selectedModel")
          ) {
            setSelectedModel(modelNames[0]);
          }
        }
      })
      .catch((err) => {
        console.warn("Could not fetch models:", err);
        // Fallback to default
        setAvailableModels(["ai/smollm2"]);
      });

    // Cleanup: stop preview on unmount
    return () => {
      fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      }).catch(console.error);
    };
  }, []);

  const handleOpenProject = async () => {
    if (!repoPath) return;

    const info = {
      framework: "Next.js", // stub detection
      name: repoPath.split("/").pop(),
    };
    setProjectInfo(info);
    sessionStorage.setItem("projectInfo", JSON.stringify(info));

    // Start preview with mocks
    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const response = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", projectPath: repoPath }),
      });

      const data = await response.json();

      if (data.success) {
        setPreviewUrl(data.appUrl);
        console.log("Preview started:", data.appUrl);
        console.log("Mock API at:", data.mockUrl);
      } else {
        setPreviewError(data.error || "Failed to start preview");
      }
    } catch (error) {
      console.error("Failed to start preview:", error);
      setPreviewError("Failed to start preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRunAgent = async () => {
    setIsRunning(true);
    setTrace([]);

    try {
      // Call the agent API
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          goal,
          repoPath:
            repoPath ||
            "/Users/vladislavshub/Development/home/artik-v3/examples/demo-app",
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error(`Agent execution failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Build trace from result
      const traceSteps = [
        { text: "🤖 Planner: Analyzing goal..." },
        { text: `📋 Plan: ${data.result.plan || "Generated plan"}` },
        { text: "🔧 Code Modder: Executing modifications..." },
      ];

      // Add file modifications if any
      if (data.result.filesChanged && data.result.filesChanged.length > 0) {
        traceSteps.push({
          text: `✅ Modified: ${data.result.filesChanged[0]}`,
          filePath: data.result.filesChanged[0],
          codeDiff:
            data.result.codeDiff ||
            data.result.modifications?.[0] ||
            "No diff available",
          beforeScreenshot: data.result.beforeScreenshot,
          afterScreenshot: data.result.afterScreenshot,
        } as {
          text: string;
          filePath: string;
          codeDiff: string;
          beforeScreenshot?: string;
          afterScreenshot?: string;
        });
      }

      if (data.result.screenshotPath) {
        traceSteps.push({
          text: `📸 Previewer: Captured screenshot`,
        });
      }

      traceSteps.push({ text: "✨ Complete!" });

      // Display trace
      for (const step of traceSteps) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        setTrace((prev) => [...prev, step]);
      }

      // Save trace to sessionStorage for persistence
      sessionStorage.setItem("trace", JSON.stringify(traceSteps));

      // Auto-reload preview iframe after changes
      const iframe = document.querySelector("iframe");
      if (iframe) {
        iframe.src = iframe.src; // Force reload
      }
    } catch (error) {
      console.error("Agent error:", error);
      setTrace((prev) => [
        ...prev,
        { text: `❌ Error: ${(error as Error).message}` },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleApplyChanges = () => {
    console.log("Applying changes:", selectedDiff);
    // TODO: Implement actual git apply via MCP
  };

  const handleRollback = () => {
    console.log("Rolling back changes:", selectedDiff);
    // TODO: Implement actual git rollback via MCP
  };

  if (!projectInfo) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">UI/UX Agent Platform</h1>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Open Project</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Repository Path
                </label>
                <input
                  type="text"
                  value={repoPath}
                  onChange={(e) => setRepoPath(e.target.value)}
                  placeholder="/path/to/your/react/project"
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <button
                onClick={handleOpenProject}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Open Project
              </button>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <Link
              href="/diff"
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition inline-block"
            >
              Diff Center (Standalone)
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Unified view after project is loaded
  return (
    <main className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">UI/UX Agent Platform</h1>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">{projectInfo.name}</span>
            <span className="mx-2">•</span>
            <span>{projectInfo.framework}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="text-gray-500">Model:</span>
          <select
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
              sessionStorage.setItem("selectedModel", e.target.value);
            }}
            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg border-0 cursor-pointer text-sm"
          >
            {availableModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Link
            href="/diff"
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm"
          >
            Diff Center
          </Link>
          <button
            onClick={async () => {
              // Stop preview
              try {
                await fetch("/api/preview", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "stop" }),
                });
              } catch (error) {
                console.error("Failed to stop preview:", error);
              }

              // Clear state
              setProjectInfo(null);
              setTrace([]);
              setPreviewUrl(null);
              setPreviewError(null);
              sessionStorage.removeItem("projectInfo");
              sessionStorage.removeItem("trace");
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
          >
            Close Project
          </button>
        </div>
      </div>

      {/* Split View: Preview (Left) | Agent Console (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Preview */}
        <div className="flex-1 border-r dark:border-gray-700 flex flex-col">
          <div className="bg-gray-50 dark:bg-gray-900 p-3 border-b dark:border-gray-700 flex items-center gap-2">
            <span className="text-sm font-medium">Preview</span>
            <input
              type="text"
              value={previewUrl || ""}
              readOnly
              placeholder="Starting preview..."
              className="flex-1 px-3 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
            />
          </div>
          <div className="flex-1 bg-white dark:bg-gray-800 relative">
            <iframe
              src={previewUrl || "about:blank"}
              className="w-full h-full border-0"
              title="Preview"
            />
            
            {/* Loading State */}
            {previewLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
                  <p className="text-sm">Starting preview with mocks...</p>
                  <p className="text-xs text-gray-300 mt-2">Discovering APIs and generating mocks</p>
                </div>
              </div>
            )}
            
            {/* Error State */}
            {previewError && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-900/50">
                <div className="text-white text-center p-4 max-w-md">
                  <p className="font-bold mb-2">Preview Error</p>
                  <p className="text-sm">{previewError}</p>
                  <button
                    onClick={handleOpenProject}
                    className="mt-4 px-4 py-2 bg-white text-red-900 rounded-lg hover:bg-gray-100 transition text-sm"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Agent Console */}
        <div className="w-96 flex flex-col bg-gray-50 dark:bg-gray-900">
          {/* Agent Input */}
          <div className="p-4 border-b dark:border-gray-700">
            <label className="block text-sm font-medium mb-2">
              What would you like to change?
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g., Add more colours to this layout"
              className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 resize-none"
              rows={3}
            />
            <button
              onClick={handleRunAgent}
              disabled={isRunning || !goal}
              className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {isRunning ? "Running..." : "Run Agent"}
            </button>
          </div>

          {/* Execution Trace */}
          <div className="flex-1 overflow-y-auto p-4">
            {trace.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold mb-3">Execution Trace</h3>
                {trace.map((step, index) => (
                  <div
                    key={index}
                    className={`p-2 bg-white dark:bg-gray-800 rounded text-sm font-mono border dark:border-gray-700 ${
                      step.filePath
                        ? "cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 transition"
                        : ""
                    }`}
                    onClick={() => {
                      if (step.filePath && step.codeDiff) {
                        setSelectedDiff({
                          filePath: step.filePath,
                          codeDiff: step.codeDiff,
                          beforeScreenshot: step.beforeScreenshot,
                          afterScreenshot: step.afterScreenshot,
                        });
                      }
                    }}
                  >
                    {step.text}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 text-sm mt-8">
                Enter a goal above and click "Run Agent" to start
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Diff Modal */}
      {selectedDiff && (
        <DiffModal
          isOpen={!!selectedDiff}
          onClose={() => setSelectedDiff(null)}
          filePath={selectedDiff.filePath}
          codeDiff={selectedDiff.codeDiff}
          onApply={handleApplyChanges}
          onRollback={handleRollback}
          autoApply={autoApply}
          onAutoApplyChange={setAutoApply}
        />
      )}
    </main>
  );
}

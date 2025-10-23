"use client";

import { useState } from "react";

export default function DiffPage() {
  const [beforeImage] = useState("/screenshots/before.png");
  const [afterImage] = useState("/screenshots/after.png");
  const [codeDiff] = useState(`--- a/components/Button.tsx
+++ b/components/Button.tsx
@@ -1,6 +1,7 @@
 interface ButtonProps {
   label: string;
   onClick?: () => void;
+  variant?: "primary" | "secondary";
 }
 
 export function Button(props: ButtonProps) {`);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Diff Center</h1>
          <div className="flex gap-2">
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Back
            </button>
            <a
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Home
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* UI Diff */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">UI Diff</h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Before</h3>
                <div className="border rounded-lg p-4 bg-gray-100 dark:bg-gray-700 h-64 flex items-center justify-center">
                  <span className="text-gray-500">
                    Screenshot: {beforeImage}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">After</h3>
                <div className="border rounded-lg p-4 bg-gray-100 dark:bg-gray-700 h-64 flex items-center justify-center">
                  <span className="text-gray-500">
                    Screenshot: {afterImage}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Code Diff */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Code Diff</h2>

            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-auto text-sm">
              <code>{codeDiff}</code>
            </pre>
          </div>
        </div>

        <div className="mt-6 flex gap-4 justify-end">
          <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Rollback
          </button>
          <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Apply Changes
          </button>
        </div>
      </div>
    </main>
  );
}

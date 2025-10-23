"use client";

import { useState } from "react";

export default function PreviewPage() {
  const [previewUrl, setPreviewUrl] = useState("http://localhost:3001");
  const [selectedRoute, setSelectedRoute] = useState("/");

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Preview</h1>
          <a
            href="/"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Home
          </a>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <input
                type="text"
                value={previewUrl}
                onChange={(e) => setPreviewUrl(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="Preview URL"
              />
            </div>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="/">/ (Home)</option>
              <option value="/about">/about</option>
              <option value="/contact">/contact</option>
            </select>
          </div>
        </div>

        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
          style={{ height: "calc(100vh - 250px)" }}
        >
          <iframe
            src={`${previewUrl}${selectedRoute}`}
            className="w-full h-full border-0"
            title="Preview"
          />
        </div>
      </div>
    </main>
  );
}

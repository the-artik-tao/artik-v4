"use client";

import { useEffect } from "react";

interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  codeDiff: string;
  beforeScreenshot?: string;
  afterScreenshot?: string;
  onApply: () => void;
  onRollback: () => void;
  autoApply?: boolean;
  onAutoApplyChange?: (checked: boolean) => void;
}

export function DiffModal({
  isOpen,
  onClose,
  filePath,
  codeDiff,
  beforeScreenshot,
  afterScreenshot,
  onApply,
  onRollback,
  autoApply = false,
  onAutoApplyChange,
}: DiffModalProps) {
  useEffect(() => {
    if (isOpen && autoApply) {
      // Auto-apply after a short delay
      const timer = setTimeout(() => {
        onApply();
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, autoApply, onApply, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold">Code Diff</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {filePath}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 grid grid-cols-2 gap-4">
          {/* Screenshots */}
          {(beforeScreenshot || afterScreenshot) && (
            <div className="col-span-2 space-y-4">
              <h3 className="text-sm font-semibold">UI Changes</h3>
              <div className="grid grid-cols-2 gap-4">
                {beforeScreenshot && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Before</p>
                    <div className="border rounded p-2 bg-gray-100 dark:bg-gray-900 h-48 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">
                        {beforeScreenshot}
                      </span>
                    </div>
                  </div>
                )}
                {afterScreenshot && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">After</p>
                    <div className="border rounded p-2 bg-gray-100 dark:bg-gray-900 h-48 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">
                        {afterScreenshot}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Code Diff */}
          <div className="col-span-2">
            <h3 className="text-sm font-semibold mb-2">Code Changes</h3>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto text-sm font-mono">
              <code>{codeDiff}</code>
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t dark:border-gray-700">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-apply"
              checked={autoApply}
              onChange={(e) => onAutoApplyChange?.(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <label
              htmlFor="auto-apply"
              className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
            >
              Auto-apply future changes
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onRollback();
                onClose();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Rollback
            </button>
            <button
              onClick={() => {
                onApply();
                onClose();
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

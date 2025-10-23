// Tauri APIs are only available in desktop context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const invoke = async (_command: string, _args?: any): Promise<any> => {
  throw new Error("Tauri APIs are only available in desktop context");
};

export async function openFolderDialog(): Promise<string> {
  return await invoke("open_folder_dialog");
}

export async function startDevServer(repoPath: string): Promise<number> {
  return await invoke("start_dev_server", { repoPath });
}

export async function stopDevServer(): Promise<void> {
  await invoke("stop_dev_server");
}

// Check if running in Tauri
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

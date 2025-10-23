import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { ProjectIndex } from "./types.js";

const CACHE_DIR = ".artik-cache";
const CACHE_FILE = "project-index.json";

/**
 * Serializable version of ProjectIndex for JSON storage
 */
interface SerializableIndex {
  files: Array<[string, any]>; // eslint-disable-line @typescript-eslint/no-explicit-any
  components: Array<[string, any]>; // eslint-disable-line @typescript-eslint/no-explicit-any
  embeddings: Array<[string, number[]]>;
  lastUpdated: number;
}

/**
 * Save project index to cache file
 */
export async function saveCache(
  index: ProjectIndex,
  repoPath: string
): Promise<void> {
  try {
    const cacheDir = join(repoPath, CACHE_DIR);
    await mkdir(cacheDir, { recursive: true });

    // Convert Maps to arrays for JSON serialization
    const serializable: SerializableIndex = {
      files: Array.from(index.files.entries()),
      components: Array.from(index.components.entries()),
      embeddings: Array.from(index.embeddings.entries()),
      lastUpdated: index.lastUpdated,
    };

    const cachePath = join(cacheDir, CACHE_FILE);
    await writeFile(cachePath, JSON.stringify(serializable, null, 2));

    console.log(`💾 Cache saved to ${cachePath}`);
  } catch (error) {
    console.warn("Failed to save cache:", error);
  }
}

/**
 * Load project index from cache file
 */
export async function loadCache(
  repoPath: string
): Promise<ProjectIndex | null> {
  try {
    const cachePath = join(repoPath, CACHE_DIR, CACHE_FILE);
    const content = await readFile(cachePath, "utf-8");
    const serializable: SerializableIndex = JSON.parse(content);

    // Convert arrays back to Maps
    const index: ProjectIndex = {
      files: new Map(serializable.files),
      components: new Map(serializable.components),
      embeddings: new Map(serializable.embeddings),
      lastUpdated: serializable.lastUpdated,
    };

    return index;
  } catch (error) {
    // Cache doesn't exist or is invalid
    return null;
  }
}

/**
 * Clear cache for a repository
 */
export async function clearCache(repoPath: string): Promise<void> {
  try {
    const cachePath = join(repoPath, CACHE_DIR, CACHE_FILE);
    await writeFile(cachePath, "{}");
    console.log("🗑️  Cache cleared");
  } catch (error) {
    console.warn("Failed to clear cache:", error);
  }
}


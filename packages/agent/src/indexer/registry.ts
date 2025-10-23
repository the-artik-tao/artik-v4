import { ComponentInfo, ProjectIndex } from "./types.js";

/**
 * Component Registry - stores and queries component metadata
 * Uses Map-based storage for O(1) lookups
 */
export class ComponentRegistry {
  private index: ProjectIndex;

  constructor() {
    this.index = {
      files: new Map(),
      components: new Map(),
      embeddings: new Map(),
      lastUpdated: Date.now(),
    };
  }

  /**
   * Add a file and its components to the index
   */
  async addFile(
    filePath: string,
    components: ComponentInfo[],
    mtime: number
  ): Promise<void> {
    // Store file metadata with mtime for incremental updates
    this.index.files.set(filePath, {
      path: filePath,
      lastModified: mtime,
      components: components.map((c) => c.name),
    });

    // Store each component
    for (const component of components) {
      this.index.components.set(component.name, component);
    }

    this.index.lastUpdated = Date.now();
  }

  /**
   * Remove a file and all its components from the index
   */
  removeFile(filePath: string): void {
    const metadata = this.index.files.get(filePath);
    if (!metadata) return;

    // Remove all components from this file
    for (const componentName of metadata.components) {
      this.index.components.delete(componentName);
      this.index.embeddings.delete(componentName);
    }

    this.index.files.delete(filePath);
    this.index.lastUpdated = Date.now();
  }

  /**
   * Add an embedding for a component
   */
  addEmbedding(componentName: string, embedding: number[]): void {
    this.index.embeddings.set(componentName, embedding);
  }

  /**
   * Get a component by name
   */
  getComponentByName(name: string): ComponentInfo | undefined {
    return this.index.components.get(name);
  }

  /**
   * Get all components
   */
  getAllComponents(): ComponentInfo[] {
    return Array.from(this.index.components.values());
  }

  /**
   * Get components from specific files
   */
  getComponentsByFiles(filePaths: string[]): ComponentInfo[] {
    const components: ComponentInfo[] = [];

    for (const filePath of filePaths) {
      const metadata = this.index.files.get(filePath);
      if (!metadata) continue;

      for (const componentName of metadata.components) {
        const component = this.index.components.get(componentName);
        if (component) {
          components.push(component);
        }
      }
    }

    return components;
  }

  /**
   * Load index from cache
   */
  loadFromCache(cached: ProjectIndex): void {
    this.index = cached;
  }

  /**
   * Get the full index
   */
  getIndex(): ProjectIndex {
    return this.index;
  }

  /**
   * Get index statistics
   */
  getStats() {
    return {
      files: this.index.files.size,
      components: this.index.components.size,
      embeddings: this.index.embeddings.size,
      lastUpdated: new Date(this.index.lastUpdated).toISOString(),
    };
  }
}


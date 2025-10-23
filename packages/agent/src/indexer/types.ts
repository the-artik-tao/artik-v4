export interface PropInfo {
  name: string;
  type?: string;
  optional: boolean;
  description?: string;
}

export interface ComponentInfo {
  name: string;
  filePath: string;
  isDefault: boolean;
  props: PropInfo[];
  jsxStructure: string; // Simplified JSX tree
  imports: string[];
  exports: string[];
}

export interface FileMetadata {
  path: string;
  lastModified: number; // mtime in milliseconds for incremental updates
  components: string[]; // Component names in this file
}

export interface ProjectIndex {
  files: Map<string, FileMetadata>;
  components: Map<string, ComponentInfo>;
  embeddings: Map<string, number[]>;
  lastUpdated: number;
}

export interface ScanOptions {
  rootPath: string;
  extensions: string[]; // ['.tsx', '.ts', '.jsx', '.js']
  ignore: string[]; // ['node_modules', '.next', 'dist', 'build']
}

export interface EmbeddingOptions {
  baseURL: string; // http://localhost:12434
  model: string; // Default model for embeddings
}


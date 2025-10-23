import { stat } from "fs/promises";
import pLimit from "p-limit";
import { loadCache, saveCache } from "./cache.js";
import { generateComponentEmbeddingWithRetry } from "./embeddings.js";
import { parseFile } from "./parser.js";
import { ComponentRegistry } from "./registry.js";
import { scanProject } from "./scanner.js";
/**
 * Project Indexer - orchestrates scanning, parsing, and indexing
 * Features:
 * - Parallel processing (10 files, 5 embeddings concurrently)
 * - Incremental updates (only re-index changed files)
 * - Retry logic for embeddings
 * - Progress reporting
 * - Statistics tracking
 */
export class ProjectIndexer {
    registry;
    repoPath;
    stats = {
        filesScanned: 0,
        filesSkipped: 0,
        componentsParsed: 0,
        embeddingsGenerated: 0,
    };
    constructor(repoPath) {
        this.repoPath = repoPath;
        this.registry = new ComponentRegistry();
    }
    /**
     * Build the project index
     * Tries to load from cache first, then does incremental or full build
     */
    async buildIndex() {
        console.log("🔍 Building project index...");
        const startTime = Date.now();
        // Try to load from cache
        const cached = await loadCache(this.repoPath);
        if (cached) {
            console.log("✅ Loaded index from cache");
            this.registry.loadFromCache(cached);
            // Check for file changes (incremental update)
            await this.incrementalUpdate(cached);
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ Index ready in ${duration}s`);
            this.logStats();
            return;
        }
        // Full index build
        await this.fullIndexBuild();
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Index built in ${duration}s`);
        this.logStats();
    }
    /**
     * Incremental update - only re-index changed files
     */
    async incrementalUpdate(cached) {
        console.log("🔄 Checking for file changes...");
        const changedFiles = [];
        // Check each cached file's mtime
        for (const [filePath, metadata] of cached.files.entries()) {
            try {
                const stats = await stat(filePath);
                const currentMtime = stats.mtimeMs;
                if (currentMtime > metadata.lastModified) {
                    changedFiles.push(filePath);
                }
            }
            catch {
                // File deleted, remove from index
                this.registry.removeFile(filePath);
            }
        }
        if (changedFiles.length === 0) {
            console.log("✅ No changes detected");
            return;
        }
        console.log(`📝 Re-indexing ${changedFiles.length} changed files...`);
        // Re-parse changed files in parallel
        await this.parseFilesParallel(changedFiles);
        // Re-generate embeddings for changed components
        const changedComponents = this.registry.getComponentsByFiles(changedFiles);
        if (changedComponents.length > 0) {
            await this.generateEmbeddingsParallel(changedComponents);
        }
        // Save updated cache
        await saveCache(this.registry.getIndex(), this.repoPath);
        console.log("✅ Incremental update complete");
    }
    /**
     * Full index build from scratch
     */
    async fullIndexBuild() {
        // Scan for files
        const files = await scanProject({
            rootPath: this.repoPath,
            extensions: [".tsx", ".ts", ".jsx", ".js"],
            ignore: ["node_modules/**", ".next/**", "dist/**", "build/**", "*.test.*", "*.spec.*"],
        });
        console.log(`📂 Found ${files.length} files`);
        this.stats.filesScanned = files.length;
        // Parse files in parallel (batches of 10)
        await this.parseFilesParallel(files);
        // Generate embeddings in parallel
        const allComponents = this.registry.getAllComponents();
        console.log(`🧠 Generating embeddings for ${allComponents.length} components...`);
        if (allComponents.length > 0) {
            await this.generateEmbeddingsParallel(allComponents);
        }
        // Save to cache
        await saveCache(this.registry.getIndex(), this.repoPath);
    }
    /**
     * Parse files in parallel with concurrency limit
     */
    async parseFilesParallel(files) {
        const limit = pLimit(10); // Process 10 files at a time
        const tasks = files.map((file) => limit(async () => {
            try {
                const stats = await stat(file);
                const components = await parseFile(file);
                if (components.length > 0) {
                    await this.registry.addFile(file, components, stats.mtimeMs);
                    this.stats.componentsParsed += components.length;
                }
                else {
                    this.stats.filesSkipped++;
                }
            }
            catch (error) {
                console.warn(`⚠️  Failed to parse ${file}:`, error);
                this.stats.filesSkipped++;
            }
        }));
        await Promise.all(tasks);
        console.log(`✅ Parsed ${this.stats.componentsParsed} components from ${files.length - this.stats.filesSkipped} files`);
    }
    /**
     * Generate embeddings in parallel with concurrency limit
     */
    async generateEmbeddingsParallel(components) {
        const limit = pLimit(5); // 5 concurrent embedding requests
        let completed = 0;
        const tasks = components.map((component) => limit(async () => {
            try {
                const embedding = await generateComponentEmbeddingWithRetry(component);
                this.registry.addEmbedding(component.name, embedding);
                this.stats.embeddingsGenerated++;
                completed++;
                // Progress indicator every 10 embeddings
                if (completed % 10 === 0) {
                    console.log(`  📊 Progress: ${completed}/${components.length} embeddings`);
                }
            }
            catch (error) {
                console.warn(`⚠️  Failed embedding for ${component.name}:`, error);
            }
        }));
        await Promise.all(tasks);
        console.log(`✅ Generated ${this.stats.embeddingsGenerated} embeddings`);
    }
    /**
     * Log indexing statistics
     */
    logStats() {
        console.log("\n📊 Indexing Statistics:");
        console.log(`  Files scanned: ${this.stats.filesScanned}`);
        console.log(`  Files skipped: ${this.stats.filesSkipped}`);
        console.log(`  Components parsed: ${this.stats.componentsParsed}`);
        console.log(`  Embeddings generated: ${this.stats.embeddingsGenerated}`);
    }
    /**
     * Get the project index
     */
    getIndex() {
        return this.registry.getIndex();
    }
    /**
     * Get indexing statistics
     */
    getStats() {
        return {
            ...this.stats,
            registry: this.registry.getStats(),
        };
    }
}

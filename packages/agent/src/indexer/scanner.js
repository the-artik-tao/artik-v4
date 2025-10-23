import fg from "fast-glob";
/**
 * Scan project directory for React/TypeScript files
 * Uses fast-glob for efficient recursive scanning with ignore patterns
 */
export async function scanProject(options) {
    const patterns = options.extensions.map((ext) => `**/*${ext}`);
    const files = await fg(patterns, {
        cwd: options.rootPath,
        absolute: true,
        ignore: options.ignore,
        onlyFiles: true,
        followSymbolicLinks: false,
    });
    return files;
}

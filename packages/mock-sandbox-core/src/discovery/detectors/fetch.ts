import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { readFile } from "fs/promises";
import { glob } from "glob";
import type {
  DetectedProject,
  DetectorPlugin,
  DiscoveryResult,
  RestEndpoint,
} from "../../types.js";

export const fetchDetector: DetectorPlugin = {
  name: "fetch",
  supports: () => true, // fetch is universal

  async discover(project, ctx): Promise<Partial<DiscoveryResult>> {
    ctx.logger.log("info", "Running fetch detector");

    const endpoints: RestEndpoint[] = [];
    const baseUrls = new Set<string>();
    const notes: string[] = [];

    // Find all JS/TS files
    const files = await glob("**/*.{js,jsx,ts,tsx}", {
      cwd: project.root,
      ignore: ["node_modules/**", "dist/**", "build/**", ".next/**", "out/**"],
      absolute: true,
    });

    ctx.logger.log("debug", `Scanning ${files.length} files for fetch calls`);

    for (const file of files) {
      try {
        const content = await readFile(file, "utf-8");
        const ast = parse(content, {
          sourceType: "module",
          plugins: ["jsx", "typescript"],
        });

        traverse.default(ast, {
          CallExpression(path: any) {
            // Match: fetch(url, options)
            if (
              t.isIdentifier(path.node.callee, { name: "fetch" }) ||
              (t.isMemberExpression(path.node.callee) &&
                t.isIdentifier(path.node.callee.object, { name: "window" }) &&
                t.isIdentifier(path.node.callee.property, { name: "fetch" }))
            ) {
              const [urlArg, optionsArg] = path.node.arguments;

              // Extract URL
              const urlInfo = extractUrl(urlArg, project);
              if (urlInfo) {
                const { url, baseUrl } = urlInfo;
                if (baseUrl) baseUrls.add(baseUrl);

                // Extract method and headers from options
                let method = "GET";
                let headers: Record<string, string> | undefined;
                let exampleRequestBody: any = null;

                if (optionsArg && t.isObjectExpression(optionsArg)) {
                  for (const prop of optionsArg.properties) {
                    if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                      if (
                        prop.key.name === "method" &&
                        t.isStringLiteral(prop.value)
                      ) {
                        method = prop.value.value.toUpperCase();
                      } else if (
                        prop.key.name === "headers" &&
                        t.isObjectExpression(prop.value)
                      ) {
                        headers = extractHeaders(prop.value);
                      } else if (prop.key.name === "body") {
                        exampleRequestBody = extractBody(prop.value);
                      }
                    }
                  }
                }

                endpoints.push({
                  method,
                  path: url,
                  headers,
                  exampleRequestBody,
                });
              }
            }
          },
        });
      } catch (error) {
        notes.push(`Failed to parse ${file}: ${error}`);
      }
    }

    // Deduplicate endpoints
    const uniqueEndpoints = deduplicateEndpoints(endpoints);

    ctx.logger.log(
      "info",
      `Found ${uniqueEndpoints.length} unique fetch calls`
    );

    return {
      rest: uniqueEndpoints,
      baseUrls: Array.from(baseUrls),
      notes,
    };
  },
};

function extractUrl(
  node: t.Node | undefined,
  project: DetectedProject
): { url: string; baseUrl?: string } | null {
  if (!node) return null;

  // String literal: fetch("/api/users")
  if (t.isStringLiteral(node)) {
    const url = node.value;
    return parseUrl(url);
  }

  // Template literal: fetch(`/api/users/${id}`)
  if (t.isTemplateLiteral(node)) {
    const parts = node.quasis.map((q) => q.value.raw);
    const url = parts.join(":param");
    return parseUrl(url);
  }

  // Env variable: fetch(process.env.API_URL + "/users")
  if (t.isBinaryExpression(node, { operator: "+" })) {
    const left = extractUrl(node.left, project);
    const right = extractUrl(node.right, project);
    if (left && right) {
      return {
        url: left.url + right.url,
        baseUrl: left.baseUrl || right.baseUrl,
      };
    }
  }

  // Member expression: process.env.VITE_API_URL
  if (t.isMemberExpression(node)) {
    const envVar = extractEnvVar(node);
    if (envVar && project.env[envVar]) {
      const url = project.env[envVar]!;
      return parseUrl(url);
    }
  }

  return null;
}

function parseUrl(url: string): { url: string; baseUrl?: string } {
  // Absolute URL
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const parsed = new URL(url);
      return { url: parsed.pathname, baseUrl: parsed.origin };
    } catch {
      return { url };
    }
  }

  // Relative URL
  return { url };
}

function extractEnvVar(node: t.MemberExpression): string | null {
  // process.env.VITE_API_URL
  if (
    t.isMemberExpression(node.object) &&
    t.isIdentifier(node.object.object, { name: "process" }) &&
    t.isIdentifier(node.object.property, { name: "env" }) &&
    t.isIdentifier(node.property)
  ) {
    return node.property.name;
  }

  // import.meta.env.VITE_API_URL
  if (
    t.isMemberExpression(node.object) &&
    t.isMetaProperty(node.object.object) &&
    t.isIdentifier(node.object.property, { name: "env" }) &&
    t.isIdentifier(node.property)
  ) {
    return node.property.name;
  }

  return null;
}

function extractHeaders(node: t.ObjectExpression): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const prop of node.properties) {
    if (
      t.isObjectProperty(prop) &&
      (t.isStringLiteral(prop.key) || t.isIdentifier(prop.key)) &&
      t.isStringLiteral(prop.value)
    ) {
      const key = t.isStringLiteral(prop.key) ? prop.key.value : prop.key.name;
      headers[key] = prop.value.value;
    }
  }
  return headers;
}

function extractBody(node: t.Node): any {
  // JSON.stringify(obj)
  if (
    t.isCallExpression(node) &&
    t.isMemberExpression(node.callee) &&
    t.isIdentifier(node.callee.object, { name: "JSON" }) &&
    t.isIdentifier(node.callee.property, { name: "stringify" })
  ) {
    const arg = node.arguments[0];
    if (t.isObjectExpression(arg)) {
      return "{}"; // Placeholder
    }
  }

  return null;
}

function deduplicateEndpoints(endpoints: RestEndpoint[]): RestEndpoint[] {
  const seen = new Map<string, RestEndpoint>();

  for (const endpoint of endpoints) {
    const key = `${endpoint.method}:${endpoint.path}`;
    if (!seen.has(key)) {
      seen.set(key, endpoint);
    }
  }

  return Array.from(seen.values());
}

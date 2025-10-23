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

export const axiosDetector: DetectorPlugin = {
  name: "axios",
  supports: (project) => {
    // Check if axios is in dependencies
    const pkgPath = `${project.root}/package.json`;
    try {
      const pkg = require(pkgPath);
      return !!(pkg.dependencies?.axios || pkg.devDependencies?.axios);
    } catch {
      return false;
    }
  },

  async discover(project, ctx): Promise<Partial<DiscoveryResult>> {
    ctx.logger.log("info", "Running axios detector");

    const endpoints: RestEndpoint[] = [];
    const baseUrls = new Set<string>();
    const notes: string[] = [];

    // Track axios.create() instances and their baseURLs
    const axiosInstances = new Map<string, string>();

    const files = await glob("**/*.{js,jsx,ts,tsx}", {
      cwd: project.root,
      ignore: ["node_modules/**", "dist/**", "build/**", ".next/**"],
      absolute: true,
    });

    ctx.logger.log("debug", `Scanning ${files.length} files for axios calls`);

    for (const file of files) {
      try {
        const content = await readFile(file, "utf-8");
        const ast = parse(content, {
          sourceType: "module",
          plugins: ["jsx", "typescript"],
        });

        // First pass: find axios.create() calls
        traverse.default(ast, {
          CallExpression(path: any) {
            if (
              t.isMemberExpression(path.node.callee) &&
              t.isIdentifier(path.node.callee.object, { name: "axios" }) &&
              t.isIdentifier(path.node.callee.property, { name: "create" })
            ) {
              const configArg = path.node.arguments[0];
              if (configArg && t.isObjectExpression(configArg)) {
                const baseUrl = extractBaseUrl(configArg, project);
                if (baseUrl) {
                  // Try to find the variable this is assigned to
                  const parent = path.parentPath;
                  if (
                    parent.isVariableDeclarator() &&
                    t.isIdentifier(parent.node.id)
                  ) {
                    axiosInstances.set(parent.node.id.name, baseUrl);
                  }
                }
              }
            }
          },
        });

        // Second pass: find axios calls
        traverse.default(ast, {
          CallExpression(path: any) {
            // axios(url, config) or axios(config)
            if (t.isIdentifier(path.node.callee, { name: "axios" })) {
              const endpoint = extractAxiosCall(
                path.node,
                axiosInstances,
                project
              );
              if (endpoint) {
                endpoints.push(endpoint);
                if (endpoint.headers?.["X-Base-URL"]) {
                  baseUrls.add(endpoint.headers["X-Base-URL"]);
                  delete endpoint.headers["X-Base-URL"];
                }
              }
            }

            // axios.get(url, config), axios.post(url, data, config), etc.
            if (
              t.isMemberExpression(path.node.callee) &&
              t.isIdentifier(path.node.callee.object, { name: "axios" }) &&
              t.isIdentifier(path.node.callee.property)
            ) {
              const method = path.node.callee.property.name.toUpperCase();
              if (
                [
                  "GET",
                  "POST",
                  "PUT",
                  "PATCH",
                  "DELETE",
                  "HEAD",
                  "OPTIONS",
                ].includes(method)
              ) {
                const endpoint = extractAxiosMethodCall(
                  method,
                  path.node,
                  axiosInstances,
                  project
                );
                if (endpoint) endpoints.push(endpoint);
              }
            }

            // customAxiosInstance.get() etc
            if (
              t.isMemberExpression(path.node.callee) &&
              t.isIdentifier(path.node.callee.object) &&
              axiosInstances.has(path.node.callee.object.name) &&
              t.isIdentifier(path.node.callee.property)
            ) {
              const instanceName = path.node.callee.object.name;
              const baseUrl = axiosInstances.get(instanceName)!;
              const method = path.node.callee.property.name.toUpperCase();

              if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
                const endpoint = extractAxiosMethodCall(
                  method,
                  path.node,
                  axiosInstances,
                  project,
                  baseUrl
                );
                if (endpoint) {
                  baseUrls.add(baseUrl);
                  endpoints.push(endpoint);
                }
              }
            }
          },
        });
      } catch (error) {
        notes.push(`Failed to parse ${file}: ${error}`);
      }
    }

    const uniqueEndpoints = deduplicateEndpoints(endpoints);
    ctx.logger.log(
      "info",
      `Found ${uniqueEndpoints.length} unique axios calls`
    );

    return {
      rest: uniqueEndpoints,
      baseUrls: Array.from(baseUrls),
      notes,
    };
  },
};

function extractBaseUrl(
  config: t.ObjectExpression,
  _project: DetectedProject
): string | null {
  for (const prop of config.properties) {
    if (
      t.isObjectProperty(prop) &&
      t.isIdentifier(prop.key, { name: "baseURL" }) &&
      t.isStringLiteral(prop.value)
    ) {
      return prop.value.value;
    }
  }
  return null;
}

function extractAxiosCall(
  node: t.CallExpression,
  _instances: Map<string, string>,
  _project: DetectedProject
): RestEndpoint | null {
  const firstArg = node.arguments[0];

  // axios(config)
  if (firstArg && t.isObjectExpression(firstArg)) {
    let method = "GET";
    let url: string | null = null;

    for (const prop of firstArg.properties) {
      if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
        if (prop.key.name === "method" && t.isStringLiteral(prop.value)) {
          method = prop.value.value.toUpperCase();
        } else if (prop.key.name === "url" && t.isStringLiteral(prop.value)) {
          url = prop.value.value;
        }
      }
    }

    if (url) {
      return { method, path: url };
    }
  }

  // axios(url, config)
  if (firstArg && t.isStringLiteral(firstArg)) {
    const url = firstArg.value;
    let method = "GET";

    const secondArg = node.arguments[1];
    if (secondArg && t.isObjectExpression(secondArg)) {
      for (const prop of secondArg.properties) {
        if (
          t.isObjectProperty(prop) &&
          t.isIdentifier(prop.key, { name: "method" }) &&
          t.isStringLiteral(prop.value)
        ) {
          method = prop.value.value.toUpperCase();
        }
      }
    }

    return { method, path: url };
  }

  return null;
}

function extractAxiosMethodCall(
  method: string,
  node: t.CallExpression,
  _instances: Map<string, string>,
  _project: DetectedProject,
  baseUrl?: string
): RestEndpoint | null {
  const urlArg = node.arguments[0];

  if (urlArg && t.isStringLiteral(urlArg)) {
    const endpoint: RestEndpoint = {
      method,
      path: urlArg.value,
    };

    if (baseUrl) {
      endpoint.headers = { "X-Base-URL": baseUrl };
    }

    // For POST/PUT/PATCH, second arg might be data
    if (["POST", "PUT", "PATCH"].includes(method)) {
      const dataArg = node.arguments[1];
      if (dataArg && t.isObjectExpression(dataArg)) {
        endpoint.exampleRequestBody = "{}"; // Placeholder
      }
    }

    return endpoint;
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

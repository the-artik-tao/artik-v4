import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import * as t from "@babel/types";
import { readFile } from "fs/promises";
import { ComponentInfo, PropInfo } from "./types.js";

// Handle default export from @babel/traverse
const traverse =
  typeof traverseModule === "function"
    ? traverseModule
    : (traverseModule as any).default; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Parse a file and extract React component information
 */
export async function parseFile(filePath: string): Promise<ComponentInfo[]> {
  try {
    const code = await readFile(filePath, "utf-8");

    const ast = parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx", "decorators-legacy"],
      errorRecovery: true,
    });

    const components: ComponentInfo[] = [];
    const imports: string[] = [];
    const exports: string[] = [];

    // Extract imports
    traverse(ast, {
      ImportDeclaration(path: any) {
        // eslint-disable-line @typescript-eslint/no-explicit-any
        imports.push(path.node.source.value);
      },
    });

    // Extract components
    traverse(ast, {
      // Function declarations: function Button() {}
      FunctionDeclaration(path: any) {
        // eslint-disable-line @typescript-eslint/no-explicit-any
        if (isReactComponent(path.node, path)) {
          const component = extractComponentInfo(
            path.node,
            path,
            filePath,
            imports,
            exports,
            false
          );
          if (component) {
            components.push(component);
          }
        }
      },

      // Variable declarations: const Button = () => {}
      VariableDeclarator(path: any) {
        // eslint-disable-line @typescript-eslint/no-explicit-any
        if (
          t.isIdentifier(path.node.id) &&
          (t.isArrowFunctionExpression(path.node.init) ||
            t.isFunctionExpression(path.node.init))
        ) {
          if (isReactComponent(path.node.init, path)) {
            const component = extractComponentInfo(
              path.node.init,
              path,
              filePath,
              imports,
              exports,
              false,
              path.node.id.name
            );
            if (component) {
              components.push(component);
            }
          }
        }
      },

      // Export declarations
      ExportNamedDeclaration(path: any) {
        // eslint-disable-line @typescript-eslint/no-explicit-any
        if (path.node.declaration) {
          if (t.isFunctionDeclaration(path.node.declaration)) {
            const name = path.node.declaration.id?.name;
            if (name) exports.push(name);
          } else if (t.isVariableDeclaration(path.node.declaration)) {
            path.node.declaration.declarations.forEach((decl: any) => {
              // eslint-disable-line @typescript-eslint/no-explicit-any
              if (t.isIdentifier(decl.id)) {
                exports.push(decl.id.name);
              }
            });
          }
        }
      },

      ExportDefaultDeclaration(_path: any) {
        // eslint-disable-line @typescript-eslint/no-explicit-any
        exports.push("default");
      },
    });

    return components;
  } catch (error) {
    console.warn(`Failed to parse ${filePath}:`, error);
    return [];
  }
}

/**
 * Check if a node is a React component
 * Uses simple AST walking instead of nested traverse
 */
function isReactComponent(
  node: t.Node,
  _path: any // eslint-disable-line @typescript-eslint/no-explicit-any
): boolean {
  // Check if function returns JSX
  if (
    !t.isFunctionDeclaration(node) &&
    !t.isArrowFunctionExpression(node) &&
    !t.isFunctionExpression(node)
  ) {
    return false;
  }

  // Simple recursive check for JSX in function body
  const hasJSX = (n: t.Node): boolean => {
    if (t.isJSXElement(n) || t.isJSXFragment(n)) {
      return true;
    }

    // Check children
    for (const key in n) {
      const value = (n as any)[key]; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (value && typeof value === "object") {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === "object" && hasJSX(item)) {
              return true;
            }
          }
        } else if (hasJSX(value)) {
          return true;
        }
      }
    }

    return false;
  };

  return hasJSX(node);
}

/**
 * Extract component information from AST node
 */
function extractComponentInfo(
  node: t.Node,
  _path: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  filePath: string,
  imports: string[],
  exports: string[],
  _isDefault: boolean,
  nameOverride?: string
): ComponentInfo | null {
  let name = nameOverride;

  // Get component name
  if (!name) {
    if (t.isFunctionDeclaration(node) && node.id) {
      name = node.id.name;
    }
  }

  if (!name) {
    return null;
  }

  // Extract props
  const props: PropInfo[] = [];
  if (
    t.isFunctionDeclaration(node) ||
    t.isArrowFunctionExpression(node) ||
    t.isFunctionExpression(node)
  ) {
    const firstParam = node.params[0];
    if (firstParam && t.isIdentifier(firstParam)) {
      // Try to extract prop names from usage
      props.push({
        name: "props",
        optional: false,
      });
    } else if (firstParam && t.isObjectPattern(firstParam)) {
      // Destructured props: { label, onClick }
      firstParam.properties.forEach((prop) => {
        if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
          props.push({
            name: prop.key.name,
            optional: false,
          });
        }
      });
    }
  }

  // Extract simplified JSX structure
  const jsxStructure = extractJSXStructure(node);

  return {
    name,
    filePath,
    isDefault: exports.includes("default") && exports.includes(name),
    props,
    jsxStructure,
    imports,
    exports,
  };
}

/**
 * Extract simplified JSX structure for embedding
 * Uses simple recursive walking instead of traverse
 */
function extractJSXStructure(node: t.Node): string {
  const elements: string[] = [];

  const extractElements = (n: t.Node): void => {
    if (t.isJSXElement(n)) {
      if (t.isJSXIdentifier(n.openingElement.name)) {
        elements.push(n.openingElement.name.name);
      }
    }

    // Recursively check children
    for (const key in n) {
      const value = (n as any)[key]; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (value && typeof value === "object") {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === "object") {
              extractElements(item);
            }
          }
        } else {
          extractElements(value);
        }
      }
    }
  };

  extractElements(node);
  return elements.slice(0, 10).join(", "); // Limit to first 10 elements
}

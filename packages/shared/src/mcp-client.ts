import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface MCPToolResult {
  content: Array<{
    type: string;
    text?: string;
    json?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }>;
}

export class MCPClient {
  private client: Client;
  private transport: StdioClientTransport;

  constructor(serverCommand: string, serverArgs: string[] = []) {
    this.transport = new StdioClientTransport({
      command: serverCommand,
      args: serverArgs,
    });
    this.client = new Client(
      {
        name: "artik-agent",
        version: "0.1.0",
      },
      {
        capabilities: {},
      }
    );
  }

  async connect(): Promise<void> {
    await this.client.connect(this.transport);
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  async callTool(
    name: string,
    args: Record<string, any>
  ): Promise<MCPToolResult> {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    const result = await this.client.callTool({
      name,
      arguments: args,
    });
    return result as MCPToolResult;
  }

  async listTools(): Promise<Array<{ name: string; description: string }>> {
    const tools = await this.client.listTools();
    return tools.tools.map((t) => ({
      name: t.name,
      description: t.description || "",
    }));
  }
}

export async function createMCPClient(
  serverCommand: string,
  serverArgs: string[] = []
): Promise<MCPClient> {
  const client = new MCPClient(serverCommand, serverArgs);
  await client.connect();
  return client;
}

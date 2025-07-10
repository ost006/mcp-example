#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createQdrantServiceFromEnv } from './services/qdrant-service';
import { registerQdrantTools } from './services/qdrant-tools';

// Create server instance
const server = new McpServer({
  name: 'hello-world-mcp-server',
  version: '1.0.0',
});

// Initialize Qdrant service
const qdrantService = createQdrantServiceFromEnv();

// Register the hello world tool
server.registerTool(
  'hello_world',
  {
    title: 'Hello World',
    description: 'Returns a simple hello world message',
    inputSchema: {
      name: z
        .string()
        .optional()
        .describe('Optional name to include in the greeting'),
    },
  },
  async ({ name }) => {
    const message = name ? `Hello World, ${name}!` : 'Hello World!';

    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
    };
  }
);

// Register Qdrant tools
registerQdrantTools(server, qdrantService);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Hello World MCP server running on stdio');
  console.error('Available tools: hello_world, qdrant_*');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down server...');
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Shutting down server...');
  await server.close();
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});

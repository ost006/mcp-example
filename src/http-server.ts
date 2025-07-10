#!/usr/bin/env node

import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { createQdrantServiceFromEnv } from './services/qdrant-service';
import { registerQdrantTools } from './services/qdrant-tools';

// Interface for transport configuration
interface TransportConfig {
  sessionIdGenerator: () => string;
  onsessioninitialized: (_sessionId: string) => void;
  enableDnsRebindingProtection: boolean;
  allowedHosts?: string[];
  allowedOrigins?: string[];
}

// Create Express app
const app = express();
app.use(express.json());

// Configuration from environment variables
const PORT = process.env.PORT || 3000;
const ENABLE_DNS_REBINDING_PROTECTION =
  process.env.ENABLE_DNS_REBINDING_PROTECTION === 'true';
const ALLOWED_HOSTS = process.env.ALLOWED_HOSTS
  ? process.env.ALLOWED_HOSTS.split(',').map((host) => host.trim())
  : ['127.0.0.1', 'localhost'];
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
  : undefined;

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Function to create and configure MCP server
function createMcpServer(): McpServer {
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

  return server;
}

// Handle POST requests for client-to-server communication
app.post('/mcp', async (req, res) => {
  console.log('Received MCP POST request');

  // Check for existing session ID
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    // Reuse existing transport
    transport = transports[sessionId];
    console.log(`Using existing session: ${sessionId}`);
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New initialization request
    console.log('Creating new session for initialize request');

    // Configure transport based on environment
    const transportConfig: TransportConfig = {
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId: string) => {
        console.log(`Session initialized: ${sessionId}`);
        // Store the transport by session ID
        transports[sessionId] = transport;
      },
      enableDnsRebindingProtection: ENABLE_DNS_REBINDING_PROTECTION,
    };

    // Add allowed hosts if DNS rebinding protection is enabled
    if (ENABLE_DNS_REBINDING_PROTECTION) {
      transportConfig.allowedHosts = ALLOWED_HOSTS;
      if (ALLOWED_ORIGINS) {
        transportConfig.allowedOrigins = ALLOWED_ORIGINS;
      }
    }

    transport = new StreamableHTTPServerTransport(transportConfig);

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        console.log(`Session closed: ${transport.sessionId}`);
        delete transports[transport.sessionId];
      }
    };

    // Create and connect MCP server
    const server = createMcpServer();
    await server.connect(transport);
  } else {
    // Invalid request
    console.log('Invalid request: No valid session ID provided');
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    });
    return;
  }

  // Handle the request
  try {
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (
  req: express.Request,
  res: express.Response
) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  console.log(`Session request (${req.method}): ${sessionId}`);

  if (!sessionId || !transports[sessionId]) {
    console.log('Invalid or missing session ID');
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  const transport = transports[sessionId];
  try {
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error('Error handling session request:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal server error');
    }
  }
};

// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', handleSessionRequest);

// Handle DELETE requests for session termination
app.delete('/mcp', handleSessionRequest);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'hello-world-mcp-server',
    transport: 'streamable-http',
    activeSessions: Object.keys(transports).length,
    timestamp: new Date().toISOString(),
    configuration: {
      port: PORT,
      dnsRebindingProtection: ENABLE_DNS_REBINDING_PROTECTION,
      allowedHosts: ENABLE_DNS_REBINDING_PROTECTION
        ? ALLOWED_HOSTS
        : 'disabled',
      allowedOrigins:
        ENABLE_DNS_REBINDING_PROTECTION && ALLOWED_ORIGINS
          ? ALLOWED_ORIGINS
          : 'disabled',
    },
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Hello World MCP server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log('Transport: Streamable HTTP');
  console.log('Configuration:');
  console.log(
    `  DNS Rebinding Protection: ${ENABLE_DNS_REBINDING_PROTECTION ? 'ENABLED' : 'DISABLED'}`
  );
  if (ENABLE_DNS_REBINDING_PROTECTION) {
    console.log(`  Allowed Hosts: ${ALLOWED_HOSTS.join(', ')}`);
    if (ALLOWED_ORIGINS) {
      console.log(`  Allowed Origins: ${ALLOWED_ORIGINS.join(', ')}`);
    }
  }
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down HTTP server...');
  // Close all active transports
  for (const [sessionId, transport] of Object.entries(transports)) {
    console.log(`Closing session: ${sessionId}`);
    transport.close();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down HTTP server...');
  // Close all active transports
  for (const [sessionId, transport] of Object.entries(transports)) {
    console.log(`Closing session: ${sessionId}`);
    transport.close();
  }
  process.exit(0);
});

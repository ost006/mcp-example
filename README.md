# Hello World MCP Server

A TypeScript-based Model Context Protocol (MCP) server that provides a basic "Hello World" function and comprehensive Qdrant vector database integration.

## Features

- Simple MCP server implementation using TypeScript
- Single `hello_world` tool that returns a greeting message
- **Qdrant Vector Database Integration**:
  - Complete CRUD operations for vector collections
  - Vector similarity search capabilities
  - Collection management (create, delete, info)
  - Configurable connection settings
  - Error handling and connection testing
- Optional name parameter for personalized greetings
- Proper error handling and graceful shutdown
- Strict code quality with ESLint and Prettier
- Full compliance with .cursorrules standards
- Configurable DNS rebinding protection for security

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Development

Run the server in development mode:

**Stdio Transport (for command-line integrations):**

```bash
npm run dev
```

**HTTP Transport (for web-based integrations):**

```bash
# With DNS rebinding protection (default - secure but localhost only)
npm run dev:http

# Without DNS rebinding protection (allows external access)
npm run dev:http:open
```

### Production

Build and run the server:

**Stdio Transport:**

```bash
npm run build
npm start
```

**HTTP Transport:**

```bash
npm run build

# With DNS rebinding protection (default)
npm run start:http

# Without DNS rebinding protection (allows external access)
npm run start:http:open
```

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run the compiled stdio server
- `npm run start:http` - Run the compiled HTTP server (secure)
- `npm run start:http:open` - Run the compiled HTTP server (open access)
- `npm run dev` - Run the stdio server in development mode with ts-node
- `npm run dev:http` - Run the HTTP server in development mode (secure)
- `npm run dev:http:open` - Run the HTTP server in development mode (open access)
- `npm run clean` - Remove the dist directory
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting with Prettier
- `npm run check` - Run both linting and format checking
- `npm run fix` - Run both linting and formatting with auto-fix

## Environment Configuration

The HTTP server can be configured using environment variables:

### DNS Rebinding Protection

```bash
# Disable DNS rebinding protection (allows external access)
ENABLE_DNS_REBINDING_PROTECTION=false npm run dev:http

# Enable DNS rebinding protection with custom hosts
ENABLE_DNS_REBINDING_PROTECTION=true \
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com \
npm run dev:http
```

### Environment Variables

#### HTTP Server Configuration

| Variable                          | Default               | Description                                      |
| --------------------------------- | --------------------- | ------------------------------------------------ |
| `PORT`                            | `3000`                | Server port number                               |
| `ENABLE_DNS_REBINDING_PROTECTION` | `false`               | Enable/disable DNS rebinding protection          |
| `ALLOWED_HOSTS`                   | `127.0.0.1,localhost` | Comma-separated list of allowed hosts            |
| `ALLOWED_ORIGINS`                 | -                     | Comma-separated list of allowed origins for CORS |

#### Qdrant Configuration

| Variable         | Default     | Description                                  |
| ---------------- | ----------- | -------------------------------------------- |
| `QDRANT_HOST`    | `localhost` | Qdrant server hostname or IP address         |
| `QDRANT_PORT`    | `6333`      | Qdrant server port number                    |
| `QDRANT_API_KEY` | -           | API key for Qdrant authentication (optional) |
| `QDRANT_HTTPS`   | `false`     | Use HTTPS for Qdrant connection              |

### Configuration Examples

**Local Development (External Access):**

```bash
ENABLE_DNS_REBINDING_PROTECTION=false npm run dev:http
```

**Network Access (Specific IPs):**

```bash
ENABLE_DNS_REBINDING_PROTECTION=true \
ALLOWED_HOSTS=127.0.0.1,localhost,192.168.1.100 \
npm run dev:http
```

**Production (Secure):**

```bash
ENABLE_DNS_REBINDING_PROTECTION=true \
ALLOWED_HOSTS=your-domain.com,api.your-domain.com \
ALLOWED_ORIGINS=https://your-frontend.com,https://your-app.com \
npm run start:http
```

## Code Quality

This project follows strict coding standards defined in `.cursorrules`:

- **Language**: All code, comments, and documentation in English only
- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier with 2-space indentation, single quotes, semicolons
- **Linting**: ESLint with TypeScript support
- **Line endings**: LF (Unix-style)
- **Encoding**: UTF-8
- **Final newlines**: Required in all files

### Code Quality Commands

```bash
# Check code quality
npm run check

# Auto-fix all issues
npm run fix

# Individual commands
npm run lint          # Check linting
npm run lint:fix      # Fix linting issues
npm run format        # Format code
npm run format:check  # Check formatting
```

## MCP Tools

### hello_world

Returns a simple hello world message.

**Parameters:**

- `name` (optional): Name to include in the greeting

**Examples:**

- Without name: Returns "Hello World!"
- With name: Returns "Hello World, [name]!"

### Qdrant Vector Database Tools

#### qdrant_test_connection

Tests the connection to Qdrant server.

**Parameters:** None

**Returns:** Connection status message

#### qdrant_create_collection

Creates a new collection in Qdrant.

**Parameters:**

- `collection_name` (string): Name of the collection to create
- `vector_size` (number): Size of vectors (dimensions)
- `distance` (optional): Distance metric ('Cosine', 'Euclidean', 'Dot')

#### qdrant_list_collections

Lists all collections in Qdrant.

**Parameters:** None

**Returns:** List of collection names

#### qdrant_get_collection_info

Gets detailed information about a specific collection.

**Parameters:**

- `collection_name` (string): Name of the collection

**Returns:** Collection statistics and configuration

#### qdrant_insert_vectors

Inserts vectors into a Qdrant collection.

**Parameters:**

- `collection_name` (string): Name of the collection
- `vectors` (array): Array of vector objects with id, vector, and optional payload

**Example:**

```json
{
  "collection_name": "my_collection",
  "vectors": [
    {
      "id": "doc1",
      "vector": [0.1, 0.2, 0.3, 0.4],
      "payload": { "text": "Hello world", "category": "greeting" }
    }
  ]
}
```

#### qdrant_search_vectors

Searches for similar vectors in a collection.

**Parameters:**

- `collection_name` (string): Name of the collection
- `query_vector` (array): Query vector to search for
- `limit` (optional, number): Maximum number of results (default: 10)
- `score_threshold` (optional, number): Minimum similarity score threshold

**Returns:** Array of similar vectors with scores and metadata

#### qdrant_get_vectors

Retrieves vectors by their IDs.

**Parameters:**

- `collection_name` (string): Name of the collection
- `ids` (array): Array of vector IDs to retrieve

**Returns:** Array of vectors with their data and metadata

#### qdrant_delete_vectors

Deletes vectors by their IDs.

**Parameters:**

- `collection_name` (string): Name of the collection
- `ids` (array): Array of vector IDs to delete

#### qdrant_count_vectors

Counts the number of vectors in a collection.

**Parameters:**

- `collection_name` (string): Name of the collection

**Returns:** Number of vectors in the collection

#### qdrant_delete_collection

Deletes a collection from Qdrant.

**Parameters:**

- `collection_name` (string): Name of the collection to delete

## Qdrant Setup

### Prerequisites

1. **Install Qdrant Server**:

   **Using Docker:**

   ```bash
   docker run -p 6333:6333 -p 6334:6334 -v $(pwd)/qdrant_storage:/qdrant/storage:z qdrant/qdrant
   ```

   **Using Qdrant Cloud:**
   Sign up at [Qdrant Cloud](https://cloud.qdrant.io/) and get your API key and endpoint.

2. **Configure Environment Variables**:

   Copy `.env.example` to `.env` and configure your Qdrant settings:

   ```bash
   cp .env.example .env
   # Edit .env with your Qdrant configuration
   ```

### Quick Start with Qdrant

1. **Start Qdrant Server**:

   ```bash
   docker run -p 6333:6333 qdrant/qdrant
   ```

2. **Test Connection**:
   Use the `qdrant_test_connection` tool to verify connectivity.

3. **Create a Collection**:

   ```bash
   # Example: Create a collection for 768-dimensional vectors (e.g., for embeddings)
   qdrant_create_collection {
     "collection_name": "embeddings",
     "vector_size": 768,
     "distance": "Cosine"
   }
   ```

4. **Insert Vectors**:

   ```bash
   qdrant_insert_vectors {
     "collection_name": "embeddings",
     "vectors": [
       {
         "id": "doc1",
         "vector": [0.1, 0.2, ...], // 768 dimensions
         "payload": {"text": "Sample document", "category": "example"}
       }
     ]
   }
   ```

5. **Search Vectors**:
   ```bash
   qdrant_search_vectors {
     "collection_name": "embeddings",
     "query_vector": [0.1, 0.2, ...], // 768 dimensions
     "limit": 5
   }
   ```

## Server Configuration

The server supports two transport modes:

### Stdio Transport

- Designed for command-line integrations and direct process communication
- Listens for MCP protocol messages via stdin/stdout
- Ideal for tools like Claude Desktop or VS Code extensions

### HTTP Transport (Streamable HTTP)

- Designed for web-based integrations and remote access
- Runs on port 3000 by default (configurable via PORT environment variable)
- Provides the following endpoints:
  - `POST /mcp` - Main MCP protocol endpoint
  - `GET /mcp` - Server-sent events for real-time notifications
  - `DELETE /mcp` - Session termination
  - `GET /health` - Health check endpoint
- Supports session management with automatic cleanup
- Configurable DNS rebinding protection for security
- Supports multiple concurrent clients with separate sessions

#### Security Features

The HTTP server includes DNS rebinding protection that can be configured based on your needs:

- **Enabled (Default for `:open` scripts)**: Blocks requests with unauthorized Host headers
- **Disabled**: Allows all requests (useful for development and external access)
- **Custom Configuration**: Specify allowed hosts and origins

#### HTTP Server Usage

```bash
# Run HTTP server (external access allowed)
npm run dev:http:open

# Test health check
curl http://localhost:3000/health

# Check current configuration
curl http://localhost:3000/health | jq '.configuration'
```

#### Troubleshooting External Access

If you get "Invalid Host header" errors when accessing from external clients:

1. **Quick Fix (Development)**: Use the `:open` scripts:

   ```bash
   npm run dev:http:open
   ```

2. **Secure Fix (Production)**: Configure allowed hosts:

   ```bash
   ENABLE_DNS_REBINDING_PROTECTION=true \
   ALLOWED_HOSTS=your-domain.com,api.domain.com \
   npm run dev:http
   ```

3. **Network Access**: Allow specific IP addresses:
   ```bash
   ENABLE_DNS_REBINDING_PROTECTION=true \
   ALLOWED_HOSTS=127.0.0.1,localhost,192.168.1.100 \
   npm run dev:http
   ```

## Development

This project follows strict TypeScript configuration and includes:

- Strict type checking
- ESLint configuration with TypeScript support
- Prettier formatting
- Proper error handling
- Graceful shutdown handling
- Comprehensive code quality checks

### Configuration Files

- `.cursorrules` - Core coding standards and rules
- `.editorconfig` - Editor configuration for consistent formatting
- `eslint.config.js` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `tsconfig.json` - TypeScript configuration

## License

MIT

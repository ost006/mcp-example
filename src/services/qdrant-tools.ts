import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { QdrantService } from './qdrant-service';

export function registerQdrantTools(
  server: McpServer,
  qdrantService: QdrantService
): void {
  // Test Qdrant connection
  server.registerTool(
    'qdrant_test_connection',
    {
      title: 'Test Qdrant Connection',
      description: 'Test connection to Qdrant vector database',
      inputSchema: {},
    },
    async () => {
      try {
        const isConnected = await qdrantService.testConnection();
        return {
          content: [
            {
              type: 'text',
              text: `Qdrant connection ${isConnected ? 'successful' : 'failed'}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error testing connection: ${error}`,
            },
          ],
        };
      }
    }
  );

  // Create collection
  server.registerTool(
    'qdrant_create_collection',
    {
      title: 'Create Qdrant Collection',
      description: 'Create a new collection in Qdrant',
      inputSchema: {
        collection_name: z
          .string()
          .describe('Name of the collection to create'),
        vector_size: z.number().describe('Size of vectors (dimensions)'),
        distance: z
          .enum(['Cosine', 'Euclidean', 'Dot'])
          .optional()
          .describe('Distance metric for similarity search'),
      },
    },
    async ({ collection_name, vector_size, distance }) => {
      try {
        await qdrantService.createCollection(
          collection_name,
          vector_size,
          distance
        );
        return {
          content: [
            {
              type: 'text',
              text: `Collection '${collection_name}' created successfully with vector size ${vector_size} and distance metric ${distance || 'Cosine'}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating collection: ${error}`,
            },
          ],
        };
      }
    }
  );

  // List collections
  server.registerTool(
    'qdrant_list_collections',
    {
      title: 'List Qdrant Collections',
      description: 'List all collections in Qdrant',
      inputSchema: {},
    },
    async () => {
      try {
        const collections = await qdrantService.listCollections();
        return {
          content: [
            {
              type: 'text',
              text: `Collections: ${collections.length > 0 ? collections.join(', ') : 'No collections found'}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing collections: ${error}`,
            },
          ],
        };
      }
    }
  );

  // Get collection info
  server.registerTool(
    'qdrant_get_collection_info',
    {
      title: 'Get Qdrant Collection Info',
      description: 'Get detailed information about a specific collection',
      inputSchema: {
        collection_name: z.string().describe('Name of the collection'),
      },
    },
    async ({ collection_name }) => {
      try {
        const info = await qdrantService.getCollectionInfo(collection_name);
        return {
          content: [
            {
              type: 'text',
              text: `Collection Info:
- Name: ${info.name}
- Status: ${info.status}
- Vector Count: ${info.vectorsCount}
- Point Count: ${info.pointsCount}
- Segments Count: ${info.segmentsCount}
- Disk Usage: ${info.diskUsage} bytes
- RAM Usage: ${info.ramUsage} bytes`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting collection info: ${error}`,
            },
          ],
        };
      }
    }
  );

  // Insert vectors
  server.registerTool(
    'qdrant_insert_vectors',
    {
      title: 'Insert Vectors',
      description: 'Insert vectors into a Qdrant collection',
      inputSchema: {
        collection_name: z.string().describe('Name of the collection'),
        vectors: z
          .array(
            z.object({
              id: z
                .union([z.string(), z.number()])
                .describe('Unique ID for the vector'),
              vector: z.array(z.number()).describe('Vector values'),
              payload: z
                .record(z.any())
                .optional()
                .describe('Optional metadata'),
            })
          )
          .describe('Array of vectors to insert'),
      },
    },
    async ({ collection_name, vectors }) => {
      try {
        // Ensure payload is properly typed
        const typedVectors = vectors.map((vector) => ({
          id: vector.id,
          vector: vector.vector,
          payload: vector.payload || {},
        }));

        await qdrantService.insertVectors(collection_name, typedVectors);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully inserted ${vectors.length} vectors into collection '${collection_name}'`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error inserting vectors: ${error}`,
            },
          ],
        };
      }
    }
  );

  // Search vectors
  server.registerTool(
    'qdrant_search_vectors',
    {
      title: 'Search Vectors',
      description: 'Search for similar vectors in a Qdrant collection',
      inputSchema: {
        collection_name: z.string().describe('Name of the collection'),
        query_vector: z
          .array(z.number())
          .describe('Query vector to search for'),
        limit: z
          .number()
          .optional()
          .describe('Maximum number of results to return'),
        score_threshold: z
          .number()
          .optional()
          .describe('Minimum similarity score threshold'),
      },
    },
    async ({ collection_name, query_vector, limit, score_threshold }) => {
      try {
        const results = await qdrantService.searchVectors(
          collection_name,
          query_vector,
          limit,
          score_threshold
        );

        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No similar vectors found',
              },
            ],
          };
        }

        const resultText = results
          .map(
            (result, index) =>
              `${index + 1}. ID: ${result.id}, Score: ${result.score.toFixed(4)}${
                result.payload
                  ? `, Payload: ${JSON.stringify(result.payload)}`
                  : ''
              }`
          )
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${results.length} similar vectors:\n${resultText}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching vectors: ${error}`,
            },
          ],
        };
      }
    }
  );

  // Get vectors by IDs
  server.registerTool(
    'qdrant_get_vectors',
    {
      title: 'Get Vectors by IDs',
      description: 'Retrieve vectors by their IDs from a Qdrant collection',
      inputSchema: {
        collection_name: z.string().describe('Name of the collection'),
        ids: z
          .array(z.union([z.string(), z.number()]))
          .describe('Array of vector IDs to retrieve'),
      },
    },
    async ({ collection_name, ids }) => {
      try {
        const vectors = await qdrantService.getVectors(collection_name, ids);

        if (vectors.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No vectors found with the specified IDs',
              },
            ],
          };
        }

        const vectorText = vectors
          .map(
            (vector, index) =>
              `${index + 1}. ID: ${vector.id}, Vector: [${vector.vector.slice(0, 5).join(', ')}${
                vector.vector.length > 5 ? '...' : ''
              }]${vector.payload ? `, Payload: ${JSON.stringify(vector.payload)}` : ''}`
          )
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Retrieved ${vectors.length} vectors:\n${vectorText}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving vectors: ${error}`,
            },
          ],
        };
      }
    }
  );

  // Delete vectors
  server.registerTool(
    'qdrant_delete_vectors',
    {
      title: 'Delete Vectors',
      description: 'Delete vectors by their IDs from a Qdrant collection',
      inputSchema: {
        collection_name: z.string().describe('Name of the collection'),
        ids: z
          .array(z.union([z.string(), z.number()]))
          .describe('Array of vector IDs to delete'),
      },
    },
    async ({ collection_name, ids }) => {
      try {
        await qdrantService.deleteVectors(collection_name, ids);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted ${ids.length} vectors from collection '${collection_name}'`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting vectors: ${error}`,
            },
          ],
        };
      }
    }
  );

  // Count vectors
  server.registerTool(
    'qdrant_count_vectors',
    {
      title: 'Count Vectors',
      description: 'Count the number of vectors in a Qdrant collection',
      inputSchema: {
        collection_name: z.string().describe('Name of the collection'),
      },
    },
    async ({ collection_name }) => {
      try {
        const count = await qdrantService.countVectors(collection_name);
        return {
          content: [
            {
              type: 'text',
              text: `Collection '${collection_name}' contains ${count} vectors`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error counting vectors: ${error}`,
            },
          ],
        };
      }
    }
  );

  // Delete collection
  server.registerTool(
    'qdrant_delete_collection',
    {
      title: 'Delete Qdrant Collection',
      description: 'Delete a collection from Qdrant',
      inputSchema: {
        collection_name: z
          .string()
          .describe('Name of the collection to delete'),
      },
    },
    async ({ collection_name }) => {
      try {
        await qdrantService.deleteCollection(collection_name);
        return {
          content: [
            {
              type: 'text',
              text: `Collection '${collection_name}' deleted successfully`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting collection: ${error}`,
            },
          ],
        };
      }
    }
  );
}

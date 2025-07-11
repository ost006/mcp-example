import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { QdrantService, DocumentType, SourceType, COLLECTION_CONFIGS, VectorDocument, SearchFilter } from './qdrant-service';

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
      description: 'Insert vectors with rich metadata into a Qdrant collection',
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
                .object({
                  // Basic information
                  id: z.string().describe('Document ID'),
                  title: z.string().describe('Document title'),
                  content: z.string().describe('Document content'),
                  chunk_index: z.number().describe('Chunk index in document'),
                  total_chunks: z.number().describe('Total chunks in document'),
                  
                  // Classification information
                  document_type: z.nativeEnum(DocumentType).describe('Type of document'),
                  source_type: z.nativeEnum(SourceType).describe('Source type'),
                  category: z.string().describe('Document category'),
                  tags: z.array(z.string()).describe('Document tags'),
                  
                  // Source information
                  source_url: z.string().optional().describe('Source URL'),
                  source_path: z.string().optional().describe('Source file path'),
                  source_id: z.string().optional().describe('Source ID'),
                  
                  // Time information
                  created_at: z.string().describe('Creation timestamp'),
                  updated_at: z.string().describe('Update timestamp'),
                  published_at: z.string().optional().describe('Publication timestamp'),
                  
                  // Content information
                  language: z.string().describe('Content language'),
                  word_count: z.number().describe('Word count'),
                  reading_time: z.number().describe('Reading time in minutes'),
                  
                  // Embedding information
                  embedding_model: z.string().describe('Embedding model used'),
                  embedding_version: z.string().describe('Embedding version'),
                  
                  // Quality management
                  quality_score: z.number().optional().describe('Quality score'),
                  verification_status: z.enum(['verified', 'unverified', 'flagged']).optional().describe('Verification status'),
                  
                  // Additional metadata
                  custom_fields: z.record(z.any()).optional().describe('Custom fields'),
                })
                .describe('Document metadata'),
            })
          )
          .describe('Array of vectors to insert'),
      },
    },
    async ({ collection_name, vectors }) => {
      try {
        await qdrantService.insertVectors(collection_name, vectors as VectorDocument[]);
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
      description: 'Search for similar vectors with optional metadata filtering',
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
        filters: z
          .object({
            document_type: z
              .union([z.nativeEnum(DocumentType), z.array(z.nativeEnum(DocumentType))])
              .optional()
              .describe('Filter by document type(s)'),
            source_type: z
              .union([z.nativeEnum(SourceType), z.array(z.nativeEnum(SourceType))])
              .optional()
              .describe('Filter by source type(s)'),
            category: z
              .union([z.string(), z.array(z.string())])
              .optional()
              .describe('Filter by category/categories'),
            tags: z
              .union([z.string(), z.array(z.string())])
              .optional()
              .describe('Filter by tag(s)'),
            language: z
              .string()
              .optional()
              .describe('Filter by language'),
            created_after: z
              .string()
              .optional()
              .describe('Filter by creation date (after)'),
            created_before: z
              .string()
              .optional()
              .describe('Filter by creation date (before)'),
            quality_score_min: z
              .number()
              .optional()
              .describe('Minimum quality score'),
            verification_status: z
              .enum(['verified', 'unverified', 'flagged'])
              .optional()
              .describe('Filter by verification status'),
            custom_filters: z
              .record(z.any())
              .optional()
              .describe('Custom field filters'),
          })
          .optional()
          .describe('Optional metadata filters'),
      },
    },
    async ({ collection_name, query_vector, limit, score_threshold, filters }) => {
      try {
        const results = await qdrantService.searchVectors(
          collection_name,
          query_vector,
          limit,
          score_threshold,
          filters as SearchFilter
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

  // Create collection from predefined config
  server.registerTool(
    'qdrant_create_collection_from_config',
    {
      title: 'Create Collection from Config',
      description: 'Create a collection using predefined configuration',
      inputSchema: {
        config_name: z
          .enum(['documents', 'code_snippets', 'qa_pairs', 'conversations'])
          .describe('Name of the predefined configuration to use'),
      },
    },
    async ({ config_name }) => {
      try {
        await qdrantService.createCollectionFromConfig(config_name);
        const config = COLLECTION_CONFIGS[config_name];
        return {
          content: [
            {
              type: 'text',
              text: `Collection '${config?.name}' created successfully using predefined configuration (vector_size: ${config?.vector_size}, distance: ${config?.distance})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating collection from config: ${error}`,
            },
          ],
        };
      }
    }
  );

  // Create all predefined collections
  server.registerTool(
    'qdrant_create_all_collections',
    {
      title: 'Create All Predefined Collections',
      description: 'Create all predefined collections for RAG system',
      inputSchema: {},
    },
    async () => {
      try {
        await qdrantService.createAllPredefinedCollections();
        const collectionNames = Object.keys(COLLECTION_CONFIGS);
        return {
          content: [
            {
              type: 'text',
              text: `Attempted to create all predefined collections: ${collectionNames.join(', ')}. Check logs for individual results.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating collections: ${error}`,
            },
          ],
        };
      }
    }
  );

  // List available collection configs
  server.registerTool(
    'qdrant_list_collection_configs',
    {
      title: 'List Collection Configurations',
      description: 'List all available predefined collection configurations',
      inputSchema: {},
    },
    async () => {
      try {
        const configs = Object.entries(COLLECTION_CONFIGS)
          .map(([name, config]) => 
            `${name}: ${config.name} (vector_size: ${config.vector_size}, distance: ${config.distance})`
          )
          .join('\n');
        
        return {
          content: [
            {
              type: 'text',
              text: `Available collection configurations:\n${configs}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing collection configs: ${error}`,
            },
          ],
        };
      }
    }
  );
}

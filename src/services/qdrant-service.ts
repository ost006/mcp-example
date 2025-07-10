import { QdrantClient } from '@qdrant/js-client-rest';

export interface QdrantConfig {
  host: string;
  port: number;
  apiKey?: string;
  https?: boolean;
}

export interface VectorDocument {
  id: string | number;
  vector: number[];
  payload?: Record<string, unknown>;
}

export interface SearchResult {
  id: string | number;
  score: number;
  payload?: Record<string, unknown>;
}

export interface CollectionInfo {
  name: string;
  status: string;
  vectorsCount: number;
  pointsCount: number;
  segmentsCount: number;
  diskUsage: number;
  ramUsage: number;
}

export class QdrantService {
  private client: QdrantClient;
  private config: QdrantConfig;

  constructor(config: QdrantConfig) {
    this.config = config;
    const clientConfig: Record<string, unknown> = {
      host: config.host,
      port: config.port,
    };

    if (config.apiKey) {
      clientConfig.apiKey = config.apiKey;
    }

    if (config.https !== undefined) {
      clientConfig.https = config.https;
    }

    this.client = new QdrantClient(clientConfig);
  }

  /**
   * Test connection to Qdrant server
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (error) {
      console.error('Failed to connect to Qdrant:', error);
      return false;
    }
  }

  /**
   * Create a new collection
   */
  async createCollection(
    collectionName: string,
    vectorSize: number,
    distance: 'Cosine' | 'Euclidean' | 'Dot' = 'Cosine'
  ): Promise<void> {
    try {
      // Map distance names to match Qdrant API
      const distanceMapping = {
        Cosine: 'Cosine',
        Euclidean: 'Euclid',
        Dot: 'Dot',
      };

      await this.client.createCollection(collectionName, {
        vectors: {
          size: vectorSize,
          distance: distanceMapping[distance] as 'Cosine' | 'Euclid' | 'Dot',
        },
      });
    } catch (error) {
      throw new Error(`Failed to create collection: ${error}`);
    }
  }

  /**
   * Delete a collection
   */
  async deleteCollection(collectionName: string): Promise<void> {
    try {
      await this.client.deleteCollection(collectionName);
    } catch (error) {
      throw new Error(`Failed to delete collection: ${error}`);
    }
  }

  /**
   * List all collections
   */
  async listCollections(): Promise<string[]> {
    try {
      const response = await this.client.getCollections();
      return response.collections?.map((col) => col.name) || [];
    } catch (error) {
      throw new Error(`Failed to list collections: ${error}`);
    }
  }

  /**
   * Get collection information
   */
  async getCollectionInfo(collectionName: string): Promise<CollectionInfo> {
    try {
      const info = await this.client.getCollection(collectionName);
      return {
        name: collectionName,
        status: info.status || 'unknown',
        vectorsCount: info.vectors_count || 0,
        pointsCount: info.points_count || 0,
        segmentsCount: info.segments_count || 0,
        diskUsage: 0, // disk_usage not available in this version
        ramUsage: 0, // ram_usage not available in this version
      };
    } catch (error) {
      throw new Error(`Failed to get collection info: ${error}`);
    }
  }

  /**
   * Insert vectors into a collection
   */
  async insertVectors(
    collectionName: string,
    vectors: VectorDocument[]
  ): Promise<void> {
    try {
      const points = vectors.map((doc) => ({
        id: doc.id,
        vector: doc.vector,
        payload: doc.payload || {},
      }));

      await this.client.upsert(collectionName, {
        wait: true,
        points: points,
      });
    } catch (error) {
      throw new Error(`Failed to insert vectors: ${error}`);
    }
  }

  /**
   * Search for similar vectors
   */
  async searchVectors(
    collectionName: string,
    queryVector: number[],
    limit: number = 10,
    scoreThreshold?: number
  ): Promise<SearchResult[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const searchParams: any = {
        vector: queryVector,
        limit: limit,
        with_payload: true,
      };

      if (scoreThreshold !== undefined) {
        searchParams.score_threshold = scoreThreshold;
      }

      const response = await this.client.search(collectionName, searchParams);

      return response.map((point) => {
        const result: SearchResult = {
          id: point.id,
          score: point.score,
        };

        if (point.payload) {
          result.payload = point.payload;
        }

        return result;
      });
    } catch (error) {
      throw new Error(`Failed to search vectors: ${error}`);
    }
  }

  /**
   * Get vectors by IDs
   */
  async getVectors(
    collectionName: string,
    ids: (string | number)[]
  ): Promise<VectorDocument[]> {
    try {
      const response = await this.client.retrieve(collectionName, {
        ids: ids,
        with_payload: true,
        with_vector: true,
      });

      return response.map((point) => {
        const result: VectorDocument = {
          id: point.id,
          vector: this.extractVector(point.vector),
        };

        if (point.payload) {
          result.payload = point.payload;
        }

        return result;
      });
    } catch (error) {
      throw new Error(`Failed to get vectors: ${error}`);
    }
  }

  /**
   * Delete vectors by IDs
   */
  async deleteVectors(
    collectionName: string,
    ids: (string | number)[]
  ): Promise<void> {
    try {
      await this.client.delete(collectionName, {
        wait: true,
        points: ids,
      });
    } catch (error) {
      throw new Error(`Failed to delete vectors: ${error}`);
    }
  }

  /**
   * Update vectors
   */
  async updateVectors(
    collectionName: string,
    vectors: VectorDocument[]
  ): Promise<void> {
    try {
      await this.insertVectors(collectionName, vectors);
    } catch (error) {
      throw new Error(`Failed to update vectors: ${error}`);
    }
  }

  /**
   * Count vectors in a collection
   */
  async countVectors(collectionName: string): Promise<number> {
    try {
      const response = await this.client.count(collectionName);
      return response.count;
    } catch (error) {
      throw new Error(`Failed to count vectors: ${error}`);
    }
  }

  /**
   * Get client instance for advanced operations
   */
  getClient(): QdrantClient {
    return this.client;
  }

  /**
   * Helper method to extract vector from Qdrant response
   */
  private extractVector(vector: unknown): number[] {
    if (Array.isArray(vector)) {
      // If it's already a number array, return it
      if (vector.length > 0 && typeof vector[0] === 'number') {
        return vector;
      }
      // If it's an array of arrays, take the first one
      if (vector.length > 0 && Array.isArray(vector[0])) {
        return vector[0];
      }
    }
    return [];
  }
}

// Default configuration from environment variables
export function createQdrantServiceFromEnv(): QdrantService {
  const config: QdrantConfig = {
    host: process.env.QDRANT_HOST || 'localhost',
    port: parseInt(process.env.QDRANT_PORT || '6333', 10),
  };

  if (process.env.QDRANT_API_KEY) {
    config.apiKey = process.env.QDRANT_API_KEY;
  }

  if (process.env.QDRANT_HTTPS !== undefined) {
    config.https = process.env.QDRANT_HTTPS === 'true';
  }

  return new QdrantService(config);
}

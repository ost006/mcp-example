import { QdrantClient } from '@qdrant/js-client-rest';

// Document type enumeration
export enum DocumentType {
  ARTICLE = 'article',
  CODE = 'code',
  QA = 'qa',
  TUTORIAL = 'tutorial',
  REFERENCE = 'reference',
  NEWS = 'news',
  CONVERSATION = 'conversation'
}

// Source type enumeration
export enum SourceType {
  WEB = 'web',
  FILE = 'file',
  API = 'api',
  DATABASE = 'database',
  USER_INPUT = 'user_input'
}

// Document metadata interface
export interface DocumentMetadata {
  // Basic information
  id: string;
  title: string;
  content: string;
  chunk_index: number;
  total_chunks: number;
  
  // Classification information
  document_type: DocumentType;
  source_type: SourceType;
  category: string;
  tags: string[];
  
  // Source information
  source_url?: string;
  source_path?: string;
  source_id?: string;
  
  // Time information
  created_at: string;
  updated_at: string;
  published_at?: string;
  
  // Content information
  language: string;
  word_count: number;
  reading_time: number;
  
  // Embedding information
  embedding_model: string;
  embedding_version: string;
  
  // Quality management
  quality_score?: number;
  verification_status?: 'verified' | 'unverified' | 'flagged';
  
  // Additional metadata
  custom_fields?: Record<string, unknown>;
}

// Collection configuration
export interface CollectionConfig {
  name: string;
  vector_size: number;
  distance: 'Cosine' | 'Euclidean' | 'Dot';
}

// Predefined collection configurations
export const COLLECTION_CONFIGS: Record<string, CollectionConfig> = {
  documents: {
    name: 'documents',
    vector_size: 1536, // OpenAI text-embedding-3-small
    distance: 'Cosine'
  },
  code_snippets: {
    name: 'code_snippets',
    vector_size: 1536,
    distance: 'Cosine'
  },
  qa_pairs: {
    name: 'qa_pairs',
    vector_size: 1536,
    distance: 'Cosine'
  },
  conversations: {
    name: 'conversations',
    vector_size: 1536,
    distance: 'Cosine'
  }
};

// Search filter interface
export interface SearchFilter {
  document_type?: DocumentType | DocumentType[];
  source_type?: SourceType | SourceType[];
  category?: string | string[];
  tags?: string | string[];
  language?: string;
  created_after?: string;
  created_before?: string;
  quality_score_min?: number;
  verification_status?: 'verified' | 'unverified' | 'flagged';
  custom_filters?: Record<string, unknown>;
}

export interface QdrantConfig {
  host: string;
  port: number;
  apiKey?: string;
  https?: boolean;
}

export interface VectorDocument {
  id: string | number;
  vector: number[];
  payload?: DocumentMetadata;
}

export interface SearchResult {
  id: string | number;
  score: number;
  payload?: DocumentMetadata;
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
   * Create a collection using predefined configuration
   */
  async createCollectionFromConfig(configName: string): Promise<void> {
    const config = COLLECTION_CONFIGS[configName];
    if (!config) {
      throw new Error(`Unknown collection configuration: ${configName}`);
    }

    await this.createCollection(config.name, config.vector_size, config.distance);
  }

  /**
   * Create all predefined collections
   */
  async createAllPredefinedCollections(): Promise<void> {
    const collectionNames = Object.keys(COLLECTION_CONFIGS);
    
    for (const configName of collectionNames) {
      try {
        await this.createCollectionFromConfig(configName);
        console.log(`Created collection: ${COLLECTION_CONFIGS[configName]?.name || 'unknown'}`);
      } catch (error) {
        console.warn(`Failed to create collection ${configName}: ${error}`);
      }
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
   * Search for similar vectors with optional metadata filtering
   */
  async searchVectors(
    collectionName: string,
    queryVector: number[],
    limit: number = 10,
    scoreThreshold?: number,
    filters?: SearchFilter
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

      // Add metadata filters if provided
      if (filters) {
        const qdrantFilter = this.buildQdrantFilter(filters);
        if (qdrantFilter) {
          searchParams.filter = qdrantFilter;
        }
      }

      const response = await this.client.search(collectionName, searchParams);

      return response.map((point) => {
        const result: SearchResult = {
          id: point.id,
          score: point.score,
        };

        if (point.payload) {
          result.payload = point.payload as unknown as DocumentMetadata;
        }

        return result;
      });
    } catch (error) {
      throw new Error(`Failed to search vectors: ${error}`);
    }
  }

  /**
   * Build Qdrant filter from SearchFilter
   */
  private buildQdrantFilter(filters: SearchFilter): any {
    const conditions: any[] = [];

    // Document type filter
    if (filters.document_type) {
      const docTypes = Array.isArray(filters.document_type) 
        ? filters.document_type 
        : [filters.document_type];
      conditions.push({
        key: 'document_type',
        match: { any: docTypes }
      });
    }

    // Source type filter
    if (filters.source_type) {
      const sourceTypes = Array.isArray(filters.source_type) 
        ? filters.source_type 
        : [filters.source_type];
      conditions.push({
        key: 'source_type',
        match: { any: sourceTypes }
      });
    }

    // Category filter
    if (filters.category) {
      const categories = Array.isArray(filters.category) 
        ? filters.category 
        : [filters.category];
      conditions.push({
        key: 'category',
        match: { any: categories }
      });
    }

    // Tags filter
    if (filters.tags) {
      const tags = Array.isArray(filters.tags) 
        ? filters.tags 
        : [filters.tags];
      conditions.push({
        key: 'tags',
        match: { any: tags }
      });
    }

    // Language filter
    if (filters.language) {
      conditions.push({
        key: 'language',
        match: { value: filters.language }
      });
    }

    // Date range filters
    if (filters.created_after) {
      conditions.push({
        key: 'created_at',
        range: { gte: filters.created_after }
      });
    }

    if (filters.created_before) {
      conditions.push({
        key: 'created_at',
        range: { lte: filters.created_before }
      });
    }

    // Quality score filter
    if (filters.quality_score_min !== undefined) {
      conditions.push({
        key: 'quality_score',
        range: { gte: filters.quality_score_min }
      });
    }

    // Verification status filter
    if (filters.verification_status) {
      conditions.push({
        key: 'verification_status',
        match: { value: filters.verification_status }
      });
    }

    // Custom filters
    if (filters.custom_filters) {
      Object.entries(filters.custom_filters).forEach(([key, value]) => {
        conditions.push({
          key: `custom_fields.${key}`,
          match: { value }
        });
      });
    }

    return conditions.length > 0 ? { must: conditions } : null;
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
          result.payload = point.payload as unknown as DocumentMetadata;
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

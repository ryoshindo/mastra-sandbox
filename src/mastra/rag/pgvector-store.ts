import { Pool } from "pg";
import { PgVector } from "@mastra/pg";

// ドキュメントの型定義
export interface RAGDocument {
	pageContent: string;
	metadata: Record<string, unknown>;
	id: string;
	score: number;
}

export interface PgVectorStoreOptions {
	connectionString: string;
	tableName?: string;
	dimension?: number;
}

export class PgVectorStore {
	private pool: Pool;
	private pgVector: PgVector;
	private tableName: string;
	private dimension: number;

	constructor(options: PgVectorStoreOptions) {
		this.tableName = options.tableName || "documents";
		this.dimension = options.dimension || 1536; // OpenAI のデフォルト次元数
		this.pool = new Pool({
			connectionString: options.connectionString,
		});
		this.pgVector = new PgVector(options.connectionString);
	}

	/**
	 * ドキュメントを保存する
	 * @param documents 保存するドキュメント
	 * @param embeddings ドキュメントの埋め込みベクトル
	 */
	async addDocuments(
		documents: { content: string; metadata?: Record<string, unknown> }[],
		embeddings: number[][],
	): Promise<void> {
		if (documents.length !== embeddings.length) {
			throw new Error("ドキュメント数と埋め込みベクトル数が一致しません");
		}

		const client = await this.pool.connect();
		try {
			await client.query("BEGIN");

			for (let i = 0; i < documents.length; i++) {
				const { content, metadata } = documents[i];
				const embedding = embeddings[i];

				// ベクトルデータを pgvector 形式に変換
				const vectorString = `[${embedding.join(",")}]`;

				await client.query(
					`
				      INSERT INTO ${this.tableName} (content, metadata, embedding)
				      VALUES ($1, $2, $3::vector)
				      `,
					[content, metadata || {}, vectorString],
				);
			}

			await client.query("COMMIT");
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}

	/**
	 * 類似ドキュメントを検索する
	 * @param queryEmbedding クエリの埋め込みベクトル
	 * @param k 取得するドキュメント数
	 * @param threshold 類似度のしきい値
	 */
	async similaritySearch(
		queryEmbedding: number[],
		k = 4,
		threshold = 0.7,
	): Promise<RAGDocument[]> {
		// クエリベクトルを pgvector 形式に変換
		const vectorString = `[${queryEmbedding.join(",")}]`;

		console.log(`検索パラメータ: k=${k}, threshold=${threshold}`);

		try {
			const result = await this.pool.query(
				`
	     SELECT * FROM match_documents($1::vector, $2, $3)
	     `,
				[vectorString, threshold, k],
			);

			console.log(`検索結果の行数: ${result.rows.length}`);

			if (result.rows.length === 0) {
				console.log(
					"検索結果がありません。しきい値を下げるか、より多くのドキュメントを追加してください。",
				);
			}

			return result.rows.map((row) => ({
				pageContent: row.content,
				metadata: row.metadata,
				id: row.id.toString(),
				score: row.similarity,
			}));
		} catch (error) {
			console.error("検索中にエラーが発生しました:", error);
			throw error;
		}
	}

	/**
	 * ストアを初期化する
	 */
	async initialize(): Promise<void> {
		console.log(`ストアを初期化します。テーブル名: ${this.tableName}`);

		// テーブルが存在するか確認し、存在しない場合は作成
		const client = await this.pool.connect();
		try {
			// pgvector 拡張機能が有効化されているか確認
			await client.query("CREATE EXTENSION IF NOT EXISTS vector");

			// テーブルが存在するか確認
			const tableExists = await client.query(
				`
	       SELECT EXISTS (
	         SELECT FROM information_schema.tables
	         WHERE table_name = $1
	       )
	       `,
				[this.tableName],
			);

			console.log(
				`テーブル ${this.tableName} の存在: ${tableExists.rows[0].exists}`,
			);

			if (!tableExists.rows[0].exists) {
				// テーブルが存在しない場合は作成
				await client.query(
					`
          CREATE TABLE ${this.tableName} (
            id SERIAL PRIMARY KEY,
            content TEXT NOT NULL,
            metadata JSONB,
            embedding VECTOR(${this.dimension}),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
          `,
				);

				// インデックスを作成
				await client.query(
					`
          CREATE INDEX ${this.tableName}_embedding_idx 
          ON ${this.tableName} USING ivfflat (embedding vector_cosine_ops) 
          WITH (lists = 100)
          `,
				);

				// 検索用の関数を作成
				await client.query(
					`
          CREATE OR REPLACE FUNCTION match_documents(
            query_embedding VECTOR(${this.dimension}), 
            match_threshold FLOAT, 
            match_count INT
          )
          RETURNS TABLE(
            id INT,
            content TEXT,
            metadata JSONB,
            similarity FLOAT
          ) AS $$
          BEGIN
            RETURN QUERY
            SELECT
              ${this.tableName}.id,
              ${this.tableName}.content,
              ${this.tableName}.metadata,
              1 - (${this.tableName}.embedding <=> query_embedding) AS similarity
            FROM ${this.tableName}
            WHERE 1 - (${this.tableName}.embedding <=> query_embedding) > match_threshold
            ORDER BY ${this.tableName}.embedding <=> query_embedding
            LIMIT match_count;
          END;
          $$ LANGUAGE plpgsql;
          `,
				);
			}
		} finally {
			client.release();
		}
	}

	/**
	 * ストアを閉じる
	 */
	async close(): Promise<void> {
		await this.pool.end();
	}
}

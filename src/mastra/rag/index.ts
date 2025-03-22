import { PgVectorStore, type RAGDocument } from "./pgvector-store";
import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";

/**
 * RAG (Retrieval Augmented Generation) の設定オプション
 */
export interface RAGOptions {
	/**
	 * PostgreSQL 接続文字列
	 */
	connectionString: string;
	/**
	 * テーブル名
	 */
	tableName?: string;
	/**
	 * ベクトルの次元数
	 */
	dimension?: number;
	/**
	 * 埋め込みモデル名
	 */
	embeddingModel?: string;
}

/**
 * RAG クライアントクラス
 */
export class RAGClient {
	private store: PgVectorStore;
	private embeddingModel: string;
	private dimension: number;

	/**
	 * RAG クライアントを初期化する
	 * @param options RAG オプション
	 */
	constructor(options: RAGOptions) {
		this.store = new PgVectorStore({
			connectionString: options.connectionString,
			tableName: options.tableName,
			dimension: options.dimension,
		});
		this.embeddingModel = options.embeddingModel || "text-embedding-3-small";
		this.dimension = options.dimension || 1536;
	}

	/**
	 * ストアを初期化する
	 */
	async initialize(): Promise<void> {
		await this.store.initialize();
	}

	/**
	 * ドキュメントを追加する
	 * @param documents 追加するドキュメント
	 */
	async addDocuments(
		documents: { content: string; metadata?: Record<string, unknown> }[],
	): Promise<void> {
		// ドキュメントの埋め込みベクトルを生成
		const { embeddings } = await embedMany({
			model: openai.embedding(this.embeddingModel),
			values: documents.map((doc) => doc.content),
		});

		// ドキュメントとベクトルをストアに追加
		await this.store.addDocuments(documents, embeddings);
	}

	/**
	 * クエリに関連するドキュメントを検索する
	 * @param query 検索クエリ
	 * @param k 取得するドキュメント数
	 * @param threshold 類似度のしきい値
	 */
	async search(query: string, k = 4, threshold = 0.7): Promise<RAGDocument[]> {
		// クエリの埋め込みベクトルを生成
		const { embedding } = await embed({
			model: openai.embedding(this.embeddingModel),
			value: query,
		});

		// 類似ドキュメントを検索
		return this.store.similaritySearch(embedding, k, threshold);
	}

	/**
	 * ストアを閉じる
	 */
	async close(): Promise<void> {
		await this.store.close();
	}
}

export { PgVectorStore } from "./pgvector-store";

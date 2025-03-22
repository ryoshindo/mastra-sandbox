import { RAGClient } from "./index";
import * as dotenv from "dotenv";

// .env.development ファイルから環境変数を読み込む
dotenv.config({ path: ".env.development" });

/**
 * RAG のサンプル実行
 */
async function runRAGSample() {
	// OpenAI API キーが設定されているか確認
	if (!process.env.OPENAI_API_KEY) {
		console.error("OPENAI_API_KEY が設定されていません。");
		return;
	}
	// RAG クライアントを初期化
	const ragClient = new RAGClient({
		connectionString:
			"postgresql://postgres:password@localhost:5432/mastra_rag",
		tableName: "documents",
		dimension: 1536,
		embeddingModel: "text-embedding-3-small",
	});

	try {
		// ストアを初期化
		console.log("ストアを初期化中...");
		await ragClient.initialize();

		// サンプルドキュメントを追加
		console.log("サンプルドキュメントを追加中...");
		const sampleDocuments = [
			{
				content:
					"Mastra は AI エージェントを構築するためのフレームワークです。",
				metadata: { source: "mastra-docs", category: "overview" },
			},
			{
				content:
					"RAG (Retrieval Augmented Generation) は、大規模言語モデルの生成能力と外部知識の検索を組み合わせた手法です。",
				metadata: { source: "rag-docs", category: "concept" },
			},
			{
				content:
					"pgvector は PostgreSQL の拡張機能で、ベクトル類似性検索を提供します。",
				metadata: { source: "pgvector-docs", category: "database" },
			},
			{
				content:
					"Docker Compose はマルチコンテナ Docker アプリケーションを定義・実行するためのツールです。",
				metadata: { source: "docker-docs", category: "tool" },
			},
		];

		await ragClient.addDocuments(sampleDocuments);

		// クエリを実行
		console.log("クエリを実行中...");
		const query = "Mastra で RAG を実装する方法は？";
		const results = await ragClient.search(query, 4, 0.0); // しきい値を0に設定して、すべての結果を取得

		// 結果を表示
		console.log("検索結果:");
		console.log(`検索結果の数: ${results.length}`);

		if (results.length === 0) {
			console.log("検索結果がありません。");
		} else {
			results.forEach((result, index) => {
				console.log(`[${index + 1}] スコア: ${result.score.toFixed(4)}`);
				console.log(`    内容: ${result.pageContent}`);
				console.log(`    メタデータ: ${JSON.stringify(result.metadata)}`);
			});
		}
	} catch (error) {
		console.error("エラーが発生しました:", error);
	} finally {
		// ストアを閉じる
		await ragClient.close();
	}
}

// サンプルを実行
if (require.main === module) {
	runRAGSample().catch(console.error);
}

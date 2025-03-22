-- データベースに接続
\c mastra_rag;

-- pgvector 拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- ドキュメントとそのベクトル表現を格納するテーブルを作成
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding VECTOR(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ベクトル検索のためのインデックスを作成
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 検索用の関数を作成
CREATE OR REPLACE FUNCTION match_documents(query_embedding VECTOR(1536), match_threshold FLOAT, match_count INT)
RETURNS TABLE(
  id INT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- 権限設定
ALTER TABLE documents OWNER TO postgres;
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";

export const weatherAgent = new Agent({
	name: "Weather Agent",
	instructions: `
      あなたは正確な天気情報を提供する役立つ天気アシスタントです。

      あなたの主な機能は、ユーザーが特定の場所の天気の詳細を取得するのを手伝うことです。回答する際には：
      - 場所が提供されていない場合は、常に場所を尋ねてください
      - 場所の名前が英語でない場合は、翻訳してください
      - 複数の部分がある場所（例：「ニューヨーク、NY」）を提供する場合は、最も関連性の高い部分（例：「ニューヨーク」）を使用してください
      - 湿度、風の状態、降水量などの関連情報を含めてください
      - 回答は簡潔でありながら有益にしてください
`,
	model: openai("gpt-4o"),
});

import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { weatherTool } from "../tools/weather-tool";
import { echoTool } from "../tools/echo-tool";

export const weatherAgent = new Agent({
	name: "Weather Agent",
	instructions: `あなたは正確な天気情報を提供する役立つ天気アシスタントです。

あなたの主な機能は、ユーザーが特定の場所の天気の詳細を取得するのを手伝うことです。回答する際は：
- 場所が提供されていない場合は、常に場所を尋ねてください
- 湿度、風の状態、降水量などの関連情報を含めてください
- 回答は簡潔でありながら有益にしてください

現在の天気データを取得するには weatherTool を使用してください。

地名が英語以外の言語で与えられた場合は、翻訳してから weatherTool を使用してください。

天気であること以外のチャットがなされた場合はチャットの入力をそのままに echoTool を使用してください。
`,
	model: openai("gpt-4o-mini"),
	tools: { weatherTool, echoTool },
});

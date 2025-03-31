import { mastra } from "./mastra";
const agent = mastra.getAgent("researchAgent");

// Basic query about concepts
const query1 =
	"ニューラルネットワークを用いた系列モデリングが直面する問題は何ですか？";
const response1 = await agent.generate(query1);
console.log("\nQuery:", query1);
console.log("Response:", response1.text);

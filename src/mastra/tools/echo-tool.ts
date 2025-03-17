import { createTool } from "@mastra/core";
import { z } from "zod";

export const echoTool = createTool({
	id: "echo",
	description: "Echo back the input",
	inputSchema: z.object({
		text: z.string().describe("Text to echo"),
	}),
	outputSchema: z.object({
		echoed: z.string(),
	}),
	execute: async ({ context }) => {
		return { echoed: context.text };
	},
});

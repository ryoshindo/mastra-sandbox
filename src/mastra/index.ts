import { Mastra } from "@mastra/core";
import { weatherAgent } from "./agents";
import { createLogger } from "@mastra/core/logger";

export const mastra = new Mastra({
	agents: { weatherAgent },
	logger: createLogger({
		name: "Mastra",
		level: "info",
	}),
});

import { Mastra } from "@mastra/core";
import { PgVector } from "@mastra/pg";

import { researchAgent } from "./agents/researchAgent";

// Initialize Mastra instance
const pgVector = new PgVector(process.env.POSTGRES_CONNECTION_STRING as string);

export const mastra = new Mastra({
	agents: { researchAgent },
	vectors: { pgVector },
});

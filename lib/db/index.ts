import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  accounts,
  apiKeys,
  sessions,
  users,
  verifications,
  workflowBaseData,
  workflowBaseDataRelations,
  workflowExecutionLogs,
  workflowExecutions,
  workflowExecutionsRelations,
  workflows,
} from "./schema";

// Construct schema object for drizzle
const schema = {
  users,
  sessions,
  accounts,
  verifications,
  workflows,
  workflowExecutions,
  workflowExecutionLogs,
  workflowExecutionsRelations,
  workflowBaseData,
  workflowBaseDataRelations,
  apiKeys,
};

const connectionString =
  process.env.DATABASE_URL || "postgres://localhost:5432/workflow";

// For migrations
export const migrationClient = postgres(connectionString, { max: 1 });

// For queries
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });

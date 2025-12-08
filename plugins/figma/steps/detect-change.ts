import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  workflowBaseData,
  workflowExecutionLogs,
  workflowExecutions,
} from "@/lib/db/schema";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";

type ActivityLogEvent = {
  id: string;
  timestamp: number;
  action: {
    type: string;
    details: Record<string, unknown>;
  };
  actor: {
    id: string;
    name: string;
    email: string;
    type: string;
  } | null;
  entity: {
    id?: string;
    name?: string;
    type: string;
    [key: string]: unknown;
  };
  context: {
    client_name: string | null;
    ip_address: string;
    is_figma_support_team_action: boolean;
    org_id: string;
    team_id: string | null;
  };
};

type DetectChangeResult =
  | {
      success: true;
      newItems: ActivityLogEvent[];
      count: number;
    }
  | { success: false; error: string };

export type DetectChangeInput = StepInput & {
  baseDataId: string;
  integrationId?: string;
};

async function stepHandler(
  input: DetectChangeInput
): Promise<DetectChangeResult> {
  if (!input.baseDataId) {
    return {
      success: false,
      error: "Base data ID is required",
    };
  }

  // Get executionId from context
  const context = input._context;
  const executionId = context?.executionId;
  const currentNodeId = context?.nodeId;

  if (!executionId) {
    return {
      success: false,
      error: "Execution ID is required",
    };
  }

  // Get workflowId from execution record
  const execution = await db.query.workflowExecutions.findFirst({
    where: eq(workflowExecutions.id, executionId),
  });

  if (!execution) {
    return {
      success: false,
      error: "Execution not found",
    };
  }

  const workflowId = execution.workflowId;

  // Find the most recent "Get Activity Logs" node output from execution logs
  // Look for nodes that executed before this one with nodeType "figma/get-activity-logs"
  const whereConditions = [
    eq(workflowExecutionLogs.executionId, executionId),
    eq(workflowExecutionLogs.nodeType, "figma/get-activity-logs"),
    eq(workflowExecutionLogs.status, "success"),
  ];

  if (currentNodeId) {
    whereConditions.push(ne(workflowExecutionLogs.nodeId, currentNodeId));
  }

  const previousLogs = await db.query.workflowExecutionLogs.findFirst({
    where: and(...whereConditions),
    orderBy: [desc(workflowExecutionLogs.timestamp)],
  });

  if (!previousLogs || !previousLogs.output) {
    return {
      success: false,
      error:
        "No previous 'Get Activity Logs' node output found. Make sure to add a 'Get Activity Logs' node before this step and run the workflow.",
    };
  }

  // Extract logs from the previous node's output
  const previousOutput = previousLogs.output as Record<string, unknown>;
  const currentLogs = previousOutput.logs as ActivityLogEvent[] | undefined;

  if (!Array.isArray(currentLogs)) {
    return {
      success: false,
      error:
        "Previous 'Get Activity Logs' node output does not contain a 'logs' array. Make sure the previous node completed successfully.",
    };
  }

  try {
    // Fetch base data from database
    const baseData = await db.query.workflowBaseData.findFirst({
      where: eq(workflowBaseData.id, input.baseDataId),
    });

    if (!baseData) {
      return {
        success: false,
        error: "Base data not found",
      };
    }

    // Verify it belongs to the workflow
    if (baseData.workflowId !== workflowId) {
      return {
        success: false,
        error: "Base data does not belong to this workflow",
      };
    }

    if (!Array.isArray(baseData.data)) {
      return {
        success: false,
        error: "Base data has invalid format",
      };
    }

    const baseDataLogs = baseData.data as ActivityLogEvent[];

    // Create a set of base data log IDs for fast lookup
    const baseDataIds = new Set(baseDataLogs.map((log) => log.id));

    // Filter current logs to find new items (not in base data)
    const newItems = currentLogs.filter((log) => !baseDataIds.has(log.id));

    return {
      success: true,
      newItems,
      count: newItems.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to detect changes: ${message}`,
    };
  }
}

export async function detectChangeStep(
  input: DetectChangeInput
): Promise<DetectChangeResult> {
  "use step";

  return withStepLogging(input, () => stepHandler(input));
}

export const _integrationType = "figma";


import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { FigmaCredentials } from "../credentials";

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

type GetActivityLogsResult =
  | {
      success: true;
      logs: ActivityLogEvent[];
      count: number;
      hasMore: boolean;
      cursor?: string;
    }
  | { success: false; error: string };

export type GetActivityLogsCoreInput = {
  figmaFileUrl: string;
  events?: string;
  dateRange?: "7days" | "30days" | "90days";
  limit?: number;
  order?: "asc" | "desc";
  cursor?: string;
};

export type GetActivityLogsInput = StepInput &
  GetActivityLogsCoreInput & {
    integrationId?: string;
  };

/**
 * Extract file key from Figma URL
 * Supports formats:
 * - https://www.figma.com/file/FILE_KEY/...
 * - https://www.figma.com/design/FILE_KEY/...
 */
function extractFileKey(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    // Format: /file/FILE_KEY or /design/FILE_KEY
    if (
      (pathParts[1] === "file" || pathParts[1] === "design") &&
      pathParts[2]
    ) {
      return pathParts[2];
    }
    return null;
  } catch {
    return null;
  }
}

async function stepHandler(
  input: GetActivityLogsCoreInput,
  credentials: FigmaCredentials
): Promise<GetActivityLogsResult> {
  const accessToken = credentials.FIGMA_ACCESS_TOKEN;

  if (!accessToken) {
    return {
      success: false,
      error:
        "FIGMA_ACCESS_TOKEN is not configured. Please complete OAuth authentication in Project Integrations.",
    };
  }

  if (!input.figmaFileUrl) {
    return {
      success: false,
      error: "Figma File URL is required",
    };
  }

  const fileKey = extractFileKey(input.figmaFileUrl);
  if (!fileKey) {
    return {
      success: false,
      error:
        "Invalid Figma URL. Please provide a valid Figma file URL like: https://www.figma.com/design/FILE_KEY/...",
    };
  }

  try {
    // Calculate date range in Unix timestamps
    const now = Math.floor(Date.now() / 1000);
    let startTime = now;

    if (input.dateRange) {
      const daysMap = {
        "7days": 7,
        "30days": 30,
        "90days": 90,
      };
      const days = daysMap[input.dateRange] || 7;
      startTime = now - days * 24 * 60 * 60;
    }

    // Build query parameters
    const params = new URLSearchParams();

    if (input.events) {
      params.append("events", input.events);
    }

    // Always add start_time and end_time
    params.append("start_time", String(startTime));
    params.append("end_time", String(now));

    if (input.limit) {
      params.append("limit", String(input.limit));
    }

    if (input.order) {
      params.append("order", input.order);
    }

    if (input.cursor) {
      params.append("cursor", input.cursor);
    }

    const url = `https://api.figma.com/v1/activity_logs?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error:
            "Invalid or expired access token. Please reconnect your Figma account.",
        };
      }
      if (response.status === 403) {
        return {
          success: false,
          error:
            "Access denied. Ensure your organization is on Enterprise plan with Activity Logs API access.",
        };
      }

      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    // Figma API response structure
    const allLogs = data.meta?.activity_logs || [];
    const cursor = data.meta?.cursor;
    const hasNextPage = data.meta?.next_page || false;

    // Filter logs to only include events for the specified file
    // Events have main_file_key in action.details
    const filteredLogs = allLogs.filter((log: ActivityLogEvent) => {
      const mainFileKey = log.action?.details?.main_file_key;
      return mainFileKey === fileKey;
    });

    return {
      success: true,
      logs: filteredLogs,
      count: filteredLogs.length,
      hasMore: hasNextPage,
      cursor: cursor,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to fetch activity logs: ${message}` };
  }
}

export async function getActivityLogsStep(
  input: GetActivityLogsInput
): Promise<GetActivityLogsResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "figma";


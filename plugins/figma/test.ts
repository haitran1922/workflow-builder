export async function testFigma(credentials: Record<string, string>) {
  try {
    const accessToken = credentials.FIGMA_ACCESS_TOKEN;

    if (!accessToken) {
      return {
        success: false,
        error:
          "Access token not found. Please complete OAuth authentication first.",
      };
    }

    // Test the token by making a lightweight API call to the activity logs endpoint
    const response = await fetch(
      "https://api.figma.com/v1/activity_logs?limit=1",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

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
            "Access denied. Make sure your Figma organization is on the Enterprise plan and you have admin permissions.",
        };
      }
      return {
        success: false,
        error: `API error: HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}


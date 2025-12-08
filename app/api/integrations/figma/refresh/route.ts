import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getIntegration, updateIntegration } from "@/lib/db/integrations";

const FIGMA_TOKEN_URL = "https://api.figma.com/v1/oauth/token";

type FigmaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { integrationId } = body;

    if (!integrationId) {
      return NextResponse.json(
        { error: "Integration ID is required" },
        { status: 400 }
      );
    }

    const integration = await getIntegration(integrationId, session.user.id);

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    const clientId = integration.config.clientId as string;
    const clientSecret = integration.config.clientSecret as string;
    const refreshToken = integration.config.refreshToken as string;

    if (!(clientId && clientSecret && refreshToken)) {
      return NextResponse.json(
        { error: "Missing required credentials for token refresh" },
        { status: 400 }
      );
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    );

    const tokenResponse = await fetch(FIGMA_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Figma token refresh failed:", errorData);
      return NextResponse.json(
        { error: "Failed to refresh access token" },
        { status: 500 }
      );
    }

    const tokenData: FigmaTokenResponse = await tokenResponse.json();

    await updateIntegration(integrationId, session.user.id, {
      config: {
        ...integration.config,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: String(Date.now() + tokenData.expires_in * 1000),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to refresh Figma token:", error);
    return NextResponse.json(
      {
        error: "Failed to refresh token",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

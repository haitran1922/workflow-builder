import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export type FigmaOAuthInitResponse = {
  authUrl: string;
  state: string;
};

const FIGMA_OAUTH_URL = "https://www.figma.com/oauth";
const REDIRECT_URI =
  process.env.FIGMA_REDIRECT_URI ||
  "http://localhost:3000/api/integrations/figma/callback";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, integrationId } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 }
      );
    }

    // Encode integration ID in the state parameter as JSON
    const stateData = {
      nonce: randomBytes(32).toString("hex"),
      integrationId,
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString("base64");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      scope: "org:activity_log_read",
      state,
      response_type: "code",
    });

    const authUrl = `${FIGMA_OAUTH_URL}?${params.toString()}`;

    const response: FigmaOAuthInitResponse = {
      authUrl,
      state,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to initiate Figma OAuth:", error);
    return NextResponse.json(
      {
        error: "Failed to initiate OAuth flow",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

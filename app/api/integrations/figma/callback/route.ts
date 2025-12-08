import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateIntegration } from "@/lib/db/integrations";

const FIGMA_TOKEN_URL = "https://api.figma.com/v1/oauth/token";
const REDIRECT_URI =
  process.env.FIGMA_REDIRECT_URI ||
  "http://localhost:3000/api/integrations/figma/callback";

type FigmaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user_id_string: string;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: OAuth callback requires comprehensive error handling
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const error = searchParams.get("error");

    // Decode integration ID from state parameter
    let integrationId: string | null = null;
    if (stateParam) {
      try {
        const stateData = JSON.parse(
          Buffer.from(stateParam, "base64").toString("utf-8")
        );
        integrationId = stateData.integrationId;
      } catch (e) {
        console.error("Failed to decode state parameter:", e);
      }
    }

    if (error) {
      const errorDescription = searchParams.get("error_description") || error;
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Figma OAuth Error</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: #f5f5f5;
              }
              .container {
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                max-width: 400px;
                text-align: center;
              }
              .error {
                color: #d32f2f;
                margin-bottom: 1rem;
              }
              button {
                background: #1976d2;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 4px;
                cursor: pointer;
                font-size: 1rem;
              }
              button:hover {
                background: #1565c0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 class="error">OAuth Error</h2>
              <p>${errorDescription}</p>
              <button onclick="window.close()">Close Window</button>
            </div>
          </body>
        </html>
        `,
        {
          status: 400,
          headers: {
            "Content-Type": "text/html",
          },
        }
      );
    }

    if (!(code && stateParam)) {
      return new NextResponse("Missing required parameters: code or state", {
        status: 400,
      });
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!integrationId) {
      return new NextResponse(
        "Missing integration ID. Please retry the OAuth flow.",
        { status: 400 }
      );
    }

    const integration = await updateIntegration(
      integrationId,
      session.user.id,
      {}
    );

    if (!integration) {
      return new NextResponse("Integration not found", { status: 404 });
    }

    const clientId = integration.config.clientId as string;
    const clientSecret = integration.config.clientSecret as string;

    if (!(clientId && clientSecret)) {
      return new NextResponse(
        "Client ID and Client Secret must be configured first",
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
        redirect_uri: REDIRECT_URI,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Figma token exchange failed:", errorData);
      return new NextResponse(
        `Failed to exchange authorization code: ${errorData}`,
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
        userId: tokenData.user_id_string,
      },
    });

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Figma OAuth Success</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              background: white;
              padding: 2rem;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              max-width: 400px;
              text-align: center;
            }
            .success {
              color: #2e7d32;
              margin-bottom: 1rem;
            }
            button {
              background: #2e7d32;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 4px;
              cursor: pointer;
              font-size: 1rem;
            }
            button:hover {
              background: #1b5e20;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 class="success">Successfully Connected</h2>
            <p>Your Figma account has been successfully connected.</p>
            <p>You can now close this window and return to your workflow builder.</p>
            <button onclick="window.close()">Close Window</button>
          </div>
          <script>
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html",
        },
      }
    );
  } catch (error) {
    console.error("Figma OAuth callback error:", error);
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Figma OAuth Error</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              background: white;
              padding: 2rem;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              max-width: 400px;
              text-align: center;
            }
            .error {
              color: #d32f2f;
              margin-bottom: 1rem;
            }
            button {
              background: #1976d2;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 4px;
              cursor: pointer;
              font-size: 1rem;
            }
            button:hover {
              background: #1565c0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 class="error">OAuth Error</h2>
            <p>${error instanceof Error ? error.message : "An unexpected error occurred"}</p>
            <button onclick="window.close()">Close Window</button>
          </div>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: {
          "Content-Type": "text/html",
        },
      }
    );
  }
}

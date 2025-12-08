import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflowBaseData, workflows } from "@/lib/db/schema";

export async function GET(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await context.params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify workflow ownership
    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, workflowId),
        eq(workflows.userId, session.user.id)
      ),
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Fetch all base data for this workflow
    const baseDataList = await db.query.workflowBaseData.findMany({
      where: eq(workflowBaseData.workflowId, workflowId),
      orderBy: (baseData, { desc }) => [desc(baseData.createdAt)],
    });

    // Return only metadata (id, name, createdAt) without the full data
    const result = baseDataList.map((item) => ({
      id: item.id,
      name: item.name,
      createdAt: item.createdAt.toISOString(),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to get base data:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get base data",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await context.params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify workflow ownership
    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, workflowId),
        eq(workflows.userId, session.user.id)
      ),
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, data } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required and must be a string" },
        { status: 400 }
      );
    }

    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: "Data is required and must be an array" },
        { status: 400 }
      );
    }

    // Create new base data
    const [newBaseData] = await db
      .insert(workflowBaseData)
      .values({
        workflowId,
        name,
        data,
      })
      .returning();

    if (!newBaseData) {
      return NextResponse.json(
        { error: "Failed to create base data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: newBaseData.id,
      name: newBaseData.name,
      createdAt: newBaseData.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to create base data:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create base data",
      },
      { status: 500 }
    );
  }
}

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflowBaseData, workflows } from "@/lib/db/schema";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ workflowId: string; baseDataId: string }>;
  }
) {
  try {
    const { workflowId, baseDataId } = await context.params;
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

    // Fetch the base data
    const baseData = await db.query.workflowBaseData.findFirst({
      where: and(
        eq(workflowBaseData.id, baseDataId),
        eq(workflowBaseData.workflowId, workflowId)
      ),
    });

    if (!baseData) {
      return NextResponse.json(
        { error: "Base data not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: baseData.id,
      name: baseData.name,
      data: baseData.data,
      createdAt: baseData.createdAt.toISOString(),
      updatedAt: baseData.updatedAt.toISOString(),
    });
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

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ workflowId: string; baseDataId: string }>;
  }
) {
  try {
    const { workflowId, baseDataId } = await context.params;
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

    // Verify base data exists and belongs to this workflow
    const baseData = await db.query.workflowBaseData.findFirst({
      where: and(
        eq(workflowBaseData.id, baseDataId),
        eq(workflowBaseData.workflowId, workflowId)
      ),
    });

    if (!baseData) {
      return NextResponse.json(
        { error: "Base data not found" },
        { status: 404 }
      );
    }

    // Delete the base data
    await db
      .delete(workflowBaseData)
      .where(
        and(
          eq(workflowBaseData.id, baseDataId),
          eq(workflowBaseData.workflowId, workflowId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete base data:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete base data",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ workflowId: string; baseDataId: string }>;
  }
) {
  try {
    const { workflowId, baseDataId } = await context.params;
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

    // Verify base data exists and belongs to this workflow
    const baseData = await db.query.workflowBaseData.findFirst({
      where: and(
        eq(workflowBaseData.id, baseDataId),
        eq(workflowBaseData.workflowId, workflowId)
      ),
    });

    if (!baseData) {
      return NextResponse.json(
        { error: "Base data not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { data } = body;

    if (data !== undefined && !Array.isArray(data)) {
      return NextResponse.json(
        { error: "Data must be an array" },
        { status: 400 }
      );
    }

    // Update the base data
    const [updatedBaseData] = await db
      .update(workflowBaseData)
      .set({
        data: data !== undefined ? data : baseData.data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workflowBaseData.id, baseDataId),
          eq(workflowBaseData.workflowId, workflowId)
        )
      )
      .returning();

    if (!updatedBaseData) {
      return NextResponse.json(
        { error: "Failed to update base data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: updatedBaseData.id,
      name: updatedBaseData.name,
      data: updatedBaseData.data,
      createdAt: updatedBaseData.createdAt.toISOString(),
      updatedAt: updatedBaseData.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to update base data:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update base data",
      },
      { status: 500 }
    );
  }
}

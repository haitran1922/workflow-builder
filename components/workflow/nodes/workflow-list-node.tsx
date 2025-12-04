"use client";

import type { NodeProps } from "@xyflow/react";
import { FileText, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type WorkflowListNodeData = {
  workflowId?: string;
  workflowName?: string;
  updatedAt?: string;
  onClick?: () => void;
  isCreateNew?: boolean;
};

export function WorkflowListNode({
  data,
}: NodeProps & { data?: WorkflowListNodeData }) {
  const router = useRouter();

  const handleClick = () => {
    if (data?.onClick) {
      data.onClick();
    } else if (data?.workflowId) {
      router.push(`/workflows/${data.workflowId}`);
    }
  };

  if (data?.isCreateNew) {
    return (
      <Card className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed bg-background/50 p-8 backdrop-blur-sm transition-all hover:border-primary hover:bg-background/80">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
          <Plus className="size-8 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="mb-1 font-semibold text-lg">Create New Workflow</h3>
          <p className="text-muted-foreground text-sm">
            Start building a new automation workflow
          </p>
        </div>
        <Button
          className="gap-2 shadow-lg"
          onClick={handleClick}
          size="default"
        >
          <Plus className="size-4" />
          Create Workflow
        </Button>
      </Card>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return "";
    }
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffMins < 1) {
      return "Just now";
    }
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString();
  };

  return (
    <Card
      className="group cursor-pointer rounded-lg border bg-background p-6 shadow-sm transition-all hover:border-primary hover:shadow-md"
      onClick={handleClick}
    >
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="size-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="mb-1 truncate font-semibold text-base">
            {data?.workflowName || "Untitled Workflow"}
          </h3>
          {data?.updatedAt && (
            <p className="text-muted-foreground text-xs">
              Updated {formatDate(data.updatedAt)}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

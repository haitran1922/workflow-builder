"use client";

import { useSetAtom } from "jotai";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthDialog } from "@/components/auth/dialog";
import { api } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import {
  currentWorkflowNameAtom,
  edgesAtom,
  hasSidebarBeenShownAtom,
  nodesAtom,
  type WorkflowNode,
} from "@/lib/workflow-store";

const GRID_COLS = 3;
const NODE_WIDTH = 300;
const NODE_HEIGHT = 150;
const NODE_GAP = 40;

// Helper function to create a default trigger node
function createDefaultTriggerNode() {
  return {
    id: nanoid(),
    type: "trigger" as const,
    position: { x: 0, y: 0 },
    data: {
      label: "",
      description: "",
      type: "trigger" as const,
      config: { triggerType: "Manual" },
      status: "idle" as const,
    },
  };
}

const Home = () => {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const setNodes = useSetAtom(nodesAtom);
  const setEdges = useSetAtom(edgesAtom);
  const setCurrentWorkflowName = useSetAtom(currentWorkflowNameAtom);
  const setHasSidebarBeenShown = useSetAtom(hasSidebarBeenShownAtom);
  const [workflows, setWorkflows] = useState<
    Array<{ id: string; name: string; updatedAt: string }>
  >([]);
  const [, setIsLoadingWorkflows] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(true);

  // Reset sidebar animation state when on homepage
  useEffect(() => {
    setHasSidebarBeenShown(false);
  }, [setHasSidebarBeenShown]);

  // Check if user is anonymous
  const isAnonymous =
    !session?.user ||
    session.user.name === "Anonymous" ||
    session.user.email?.startsWith("temp-");

  // Load workflows when authenticated
  useEffect(() => {
    const loadWorkflows = async () => {
      if (isPending || isAnonymous) {
        return;
      }

      setIsLoadingWorkflows(true);
      try {
        const allWorkflows = await api.workflow.getAll();
        // Filter out the auto-save workflow
        const filtered = allWorkflows.filter((w) => w.name !== "__current__");
        setWorkflows(filtered);
      } catch (error) {
        console.error("Failed to load workflows:", error);
      } finally {
        setIsLoadingWorkflows(false);
      }
    };

    loadWorkflows();
  }, [isPending, isAnonymous]);

  // Display workflows as nodes on canvas
  useEffect(() => {
    if (isPending || isAnonymous) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const workflowNodes: WorkflowNode[] = [];

    // Add "Create New Workflow" node
    const createNewNode: WorkflowNode = {
      id: "create-new-workflow",
      type: "workflow",
      position: { x: 0, y: 0 },
      data: {
        label: "",
        type: "workflow",
        isCreateNew: true,
        onClick: async () => {
          try {
            const newNode = createDefaultTriggerNode();
            const newWorkflow = await api.workflow.create({
              name: "Untitled Workflow",
              description: "",
              nodes: [newNode],
              edges: [],
            });
            router.push(`/workflows/${newWorkflow.id}`);
          } catch (error) {
            console.error("Failed to create workflow:", error);
            toast.error("Failed to create workflow");
          }
        },
      },
      draggable: false,
      selectable: false,
    };
    workflowNodes.push(createNewNode);

    // Add workflow nodes in a grid layout
    workflows.forEach((workflow, index) => {
      const row = Math.floor((index + 1) / GRID_COLS);
      const col = (index + 1) % GRID_COLS;
      const x = (col + 1) * (NODE_WIDTH + NODE_GAP);
      const y = row * (NODE_HEIGHT + NODE_GAP);

      const workflowNode: WorkflowNode = {
        id: `workflow-${workflow.id}`,
        type: "workflow",
        position: { x, y },
        data: {
          label: workflow.name,
          type: "workflow",
          workflowId: workflow.id,
          workflowName: workflow.name,
          updatedAt: workflow.updatedAt,
        },
        draggable: false,
        selectable: false,
      };
      workflowNodes.push(workflowNode);
    });

    setNodes(workflowNodes);
    setEdges([]);
    setCurrentWorkflowName("My Workflows");
  }, [
    workflows,
    isPending,
    isAnonymous,
    setNodes,
    setEdges,
    setCurrentWorkflowName,
    router,
  ]);

  // Show auth dialog for unauthenticated users
  if (isPending) {
    return null;
  }

  if (isAnonymous) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="w-full max-w-md px-4">
          <AuthDialog
            defaultMode="signup"
            onOpenChange={setAuthDialogOpen}
            open={authDialogOpen}
          >
            <div className="text-center">
              <h1 className="mb-4 font-bold text-3xl">Welcome</h1>
              <p className="mb-6 text-muted-foreground">
                Sign up to start building your workflows
              </p>
            </div>
          </AuthDialog>
        </div>
      </div>
    );
  }

  // Canvas and toolbar are rendered by PersistentCanvas in the layout
  return null;
};

export default Home;

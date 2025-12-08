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
  const nodes = useAtomValue(nodesAtom);
  const edges = useAtomValue(edgesAtom);
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

  // Handler to add the first node (replaces the "add" node)
  const handleAddNode = useCallback(() => {
    const newNode: WorkflowNode = createDefaultTriggerNode();
    // Replace all nodes (removes the "add" node)
    setNodes([newNode]);
  }, [setNodes]);

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

  // Create workflow when first real node is added
  useEffect(() => {
    const createWorkflowAndRedirect = async () => {
      // Require authentication before creating workflow
      if (!session?.user) {
        return;
      }

      // Filter out the placeholder "add" node
      const realNodes = nodes.filter((node) => node.type !== "add");

      // Only create when we have at least one real node and haven't created a workflow yet
      if (realNodes.length === 0 || hasCreatedWorkflowRef.current) {
        return;
      }
      hasCreatedWorkflowRef.current = true;

      try {
        // Create workflow with all real nodes
        const newWorkflow = await api.workflow.create({
          name: "Untitled Workflow",
          description: "",
          nodes: realNodes,
          edges,
        });

        // Set flags to indicate we're coming from homepage (for sidebar animation)
        sessionStorage.setItem("animate-sidebar", "true");
        setIsTransitioningFromHomepage(true);

        // Redirect to the workflow page
        console.log("[Homepage] Navigating to workflow page");
        router.replace(`/workflows/${newWorkflow.id}`);
      } catch (error) {
        console.error("Failed to create workflow:", error);
        toast.error("Failed to create workflow");
        hasCreatedWorkflowRef.current = false;
      }
    };

    createWorkflowAndRedirect();
  }, [nodes, edges, router, session, setIsTransitioningFromHomepage]);

  // Block UI if not authenticated
  if (isPending) {
    return null;
  }

  if (!session?.user) {
    return (
      <AuthDialog required>
        <div style={{ display: "none" }} />
      </AuthDialog>
    );
  }

  // Canvas and toolbar are rendered by PersistentCanvas in the layout
  return null;
};

export default Home;

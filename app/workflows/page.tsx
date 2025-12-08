"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthDialog } from "@/components/auth/dialog";
import { api } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";

export default function WorkflowsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    const redirectToWorkflow = async () => {
      // Require authentication
      if (!session?.user) {
        return;
      }

      try {
        const workflows = await api.workflow.getAll();
        // Filter out the auto-save workflow
        const filtered = workflows.filter((w) => w.name !== "__current__");

        if (filtered.length > 0) {
          // Sort by updatedAt descending to get most recent
          const mostRecent = filtered.sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0];
          router.replace(`/workflows/${mostRecent.id}`);
        } else {
          // No workflows, redirect to homepage
          router.replace("/");
        }
      } catch (error) {
        console.error("Failed to load workflows:", error);
        router.replace("/");
      }
    };

    if (!isPending) {
      redirectToWorkflow();
    }
  }, [router, session, isPending]);

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

  return null;
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

type FigmaOAuthDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  integrationId: string;
  clientId: string;
};

export function FigmaOAuthDialog({
  open,
  onClose,
  onSuccess,
  integrationId,
  clientId,
}: FigmaOAuthDialogProps) {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setConnecting(true);

      const response = await fetch("/api/integrations/figma/oauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId,
          integrationId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to initiate OAuth");
      }

      const data = await response.json();

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.authUrl,
        "figma-oauth",
        `width=${width},height=${height},left=${left},top=${top},popup=yes`
      );

      if (!popup) {
        throw new Error(
          "Failed to open popup window. Please allow popups for this site."
        );
      }

      const checkInterval = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkInterval);
          setConnecting(false);
          onSuccess?.();
          onClose();
          toast.success("Successfully connected to Figma");
        }
      }, 500);
    } catch (error) {
      console.error("OAuth error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to connect to Figma"
      );
      setConnecting(false);
    }
  };

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && onClose()} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect to Figma</DialogTitle>
          <DialogDescription>
            You will be redirected to Figma to authorize access to your
            organization&apos;s activity logs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-900 text-sm">
            <p className="font-medium">Requirements:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Figma Enterprise plan</li>
              <li>Organization admin permissions</li>
              <li>OAuth app configured with scope: org:activity_log_read</li>
            </ul>
          </div>

          <Button
            className="w-full"
            disabled={connecting}
            onClick={handleConnect}
          >
            {connecting ? (
              <>
                <Spinner className="mr-2 size-4" />
                Connecting...
              </>
            ) : (
              "Connect to Figma"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

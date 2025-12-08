"use client";

import { useAtomValue } from "jotai";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api-client";
import {
  currentWorkflowIdAtom,
  executionLogsAtom,
  nodesAtom,
} from "@/lib/workflow-store";
import { findActionById } from "@/plugins";

type BaseDataSelectorProps = {
  field: {
    key: string;
    label: string;
  };
  value: string;
  onChange: (value: unknown) => void;
  disabled?: boolean;
};

type BaseDataItem = {
  id: string;
  name: string;
  createdAt: string;
};

type BaseDataWithDetails = BaseDataItem & {
  data: unknown[];
};

export function BaseDataSelector({
  value,
  onChange,
  disabled,
}: BaseDataSelectorProps) {
  const currentWorkflowId = useAtomValue(currentWorkflowIdAtom);
  const nodes = useAtomValue(nodesAtom);
  const executionLogs = useAtomValue(executionLogsAtom);
  const [baseDataList, setBaseDataList] = useState<BaseDataWithDetails[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [baseDataName, setBaseDataName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deleteBaseDataId, setDeleteBaseDataId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  // Fetch base data list with details
  useEffect(() => {
    if (!currentWorkflowId) {
      return;
    }

    const fetchBaseData = async () => {
      try {
        const list = await api.workflow.baseData.getAll(currentWorkflowId);
        const withDetails = await Promise.all(
          list.map(async (item) => {
            const details = await api.workflow.baseData.getById(
              currentWorkflowId,
              item.id
            );
            return {
              ...item,
              data: details.data,
            };
          })
        );
        setBaseDataList(withDetails);
      } catch (error) {
        console.error("Failed to fetch base data:", error);
        toast.error("Failed to load base data");
      }
    };

    fetchBaseData();
  }, [currentWorkflowId]);

  // Get "Get Activity Logs" nodes
  const getActivityLogsNodes = nodes.filter((node) => {
    if (node.data.type !== "action") {
      return false;
    }
    const actionType = node.data.config?.actionType as string | undefined;
    if (!actionType) {
      return false;
    }
    const action = findActionById(actionType);
    return (
      action?.slug === "get-activity-logs" && action?.integration === "figma"
    );
  });

  // Get logs from selected node
  const selectedNodeLog = selectedNodeId
    ? executionLogs[selectedNodeId]
    : undefined;

  const logsData =
    selectedNodeLog?.output &&
    typeof selectedNodeLog.output === "object" &&
    "logs" in selectedNodeLog.output &&
    Array.isArray(selectedNodeLog.output.logs)
      ? (selectedNodeLog.output.logs as unknown[])
      : [];

  const handleCreateBaseData = async () => {
    if (!currentWorkflowId) {
      toast.error("No workflow selected");
      return;
    }

    if (!baseDataName.trim()) {
      toast.error("Please enter a name for the base data");
      return;
    }

    if (logsData.length === 0) {
      toast.error("No logs available from selected node");
      return;
    }

    setIsCreating(true);
    try {
      const result = await api.workflow.baseData.create(currentWorkflowId, {
        name: baseDataName.trim(),
        data: logsData,
      });

      const details = await api.workflow.baseData.getById(
        currentWorkflowId,
        result.id
      );
      setBaseDataList((prev) => [{ ...result, data: details.data }, ...prev]);
      onChange(result.id);
      setIsDialogOpen(false);
      setBaseDataName("");
      setSelectedNodeId("");
      toast.success("Base data created successfully");
    } catch (error) {
      console.error("Failed to create base data:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create base data"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectBaseData = (baseDataId: string) => {
    onChange(baseDataId);
  };

  const handleDeleteBaseData = async () => {
    if (!(currentWorkflowId && deleteBaseDataId)) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.workflow.baseData.delete(currentWorkflowId, deleteBaseDataId);
      setBaseDataList((prev) =>
        prev.filter((item) => item.id !== deleteBaseDataId)
      );
      if (value === deleteBaseDataId) {
        onChange("");
      }
      setDeleteBaseDataId(null);
      toast.success("Base data deleted successfully");
    } catch (error) {
      console.error("Failed to delete base data:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete base data"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteLogEntry = async (baseDataId: string, logId: string) => {
    if (!currentWorkflowId) {
      return;
    }

    setDeletingLogId(logId);
    try {
      const baseData = baseDataList.find((item) => item.id === baseDataId);
      if (!baseData) {
        return;
      }

      const updatedData = (baseData.data as Record<string, unknown>[]).filter(
        (log) => (log.id as string) !== logId
      );

      const updated = await api.workflow.baseData.update(
        currentWorkflowId,
        baseDataId,
        { data: updatedData }
      );

      setBaseDataList((prev) =>
        prev.map((item) =>
          item.id === baseDataId ? { ...item, data: updated.data } : item
        )
      );
      toast.success("Log entry deleted");
    } catch (error) {
      console.error("Failed to delete log entry:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete log entry"
      );
    } finally {
      setDeletingLogId(null);
    }
  };

  // Helper to extract log fields safely
  const parseLogEntry = (log: unknown) => {
    const logObj = log as Record<string, unknown>;
    const id = logObj.id as string | undefined;
    const entity = logObj.entity as Record<string, unknown> | undefined;
    const name = entity?.name as string | undefined;
    const timestamp = logObj.timestamp as number | undefined;
    const actionType = (logObj.action as Record<string, unknown>)?.type as
      | string
      | undefined;
    const actor = (logObj.actor as Record<string, unknown>)?.name as
      | string
      | undefined;

    return { id, name, timestamp, actionType, actor };
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          disabled={disabled || !currentWorkflowId}
          onClick={() => setIsDialogOpen(true)}
          size="sm"
          variant="outline"
        >
          <Plus className="mr-2 size-4" />
          Create New
        </Button>
      </div>

      {baseDataList.length > 0 ? (
        <div className="space-y-4">
          {baseDataList.map((item) => (
            <div className="space-y-2 rounded-md border p-3" key={item.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    checked={value === item.id}
                    className="size-4"
                    disabled={disabled}
                    onChange={() => handleSelectBaseData(item.id)}
                    type="radio"
                  />
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {new Date(item.createdAt).toLocaleDateString()} •{" "}
                      {item.data.length} entries
                    </div>
                  </div>
                </div>
                <Button
                  disabled={disabled}
                  onClick={() => setDeleteBaseDataId(item.id)}
                  size="sm"
                  variant="ghost"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>

              {item.data.length > 0 && (
                <div className="max-h-64 overflow-auto rounded-md border bg-muted/30">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-8">ID</TableHead>
                        <TableHead className="h-8">Name</TableHead>
                        <TableHead className="h-8">Timestamp</TableHead>
                        <TableHead className="h-8">Action</TableHead>
                        <TableHead className="h-8">Actor</TableHead>
                        <TableHead className="h-8 w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {item.data.map((log: unknown, index: number) => {
                        const { id, name, timestamp, actionType, actor } =
                          parseLogEntry(log);

                        return (
                          <TableRow key={id || index}>
                            <TableCell className="font-mono text-xs">
                              {id || "N/A"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {name || "N/A"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {timestamp
                                ? new Date(timestamp * 1000).toLocaleString()
                                : "N/A"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {actionType || "N/A"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {actor || "N/A"}
                            </TableCell>
                            <TableCell>
                              <Button
                                disabled={
                                  disabled || deletingLogId === id || !id
                                }
                                onClick={() =>
                                  id && handleDeleteLogEntry(item.id, id)
                                }
                                size="sm"
                                variant="ghost"
                              >
                                <Trash2 className="size-3 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-4 text-center">
          <p className="mb-2 text-muted-foreground text-sm">
            No base data available
          </p>
          <Button
            disabled={disabled || !currentWorkflowId}
            onClick={() => setIsDialogOpen(true)}
            size="sm"
            variant="outline"
          >
            <Plus className="mr-2 size-4" />
            Create Base Data
          </Button>
        </div>
      )}

      <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
        <DialogContent className="flex max-h-[80vh] max-w-4xl flex-col">
          <DialogHeader>
            <DialogTitle>Create Base Data</DialogTitle>
            <DialogDescription>
              Select a "Get Activity Logs" node to use its output as base data
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <label
                className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="base-data-name"
              >
                Base Data Name
              </label>
              <Input
                id="base-data-name"
                onChange={(e) => setBaseDataName(e.target.value)}
                placeholder="e.g., Initial Activity Logs"
                value={baseDataName}
              />
            </div>

            <div className="space-y-2">
              <label
                className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="node-selector"
              >
                Select Get Activity Logs Node
              </label>
              {getActivityLogsNodes.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <p className="text-muted-foreground text-sm">
                    No "Get Activity Logs" nodes found in this workflow. Add one
                    first and run the workflow to see its output.
                  </p>
                </div>
              ) : (
                <Select
                  onValueChange={setSelectedNodeId}
                  value={selectedNodeId}
                >
                  <SelectTrigger id="node-selector">
                    <SelectValue placeholder="Select a node" />
                  </SelectTrigger>
                  <SelectContent>
                    {getActivityLogsNodes.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.data.label || node.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedNodeId && logsData.length > 0 && (
              <div className="space-y-2">
                <div className="font-medium text-sm">
                  Preview Logs ({logsData.length} items)
                </div>
                <div className="max-h-96 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Action Type</TableHead>
                        <TableHead>Actor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsData
                        .slice(0, 50)
                        .map((log: unknown, index: number) => {
                          const { id, name, timestamp, actionType, actor } =
                            parseLogEntry(log);

                          return (
                            <TableRow key={id || index}>
                              <TableCell className="font-mono text-xs">
                                {id || "N/A"}
                              </TableCell>
                              <TableCell>{name || "N/A"}</TableCell>
                              <TableCell>
                                {timestamp
                                  ? new Date(timestamp * 1000).toLocaleString()
                                  : "N/A"}
                              </TableCell>
                              <TableCell>{actionType || "N/A"}</TableCell>
                              <TableCell>{actor || "N/A"}</TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                  {logsData.length > 50 && (
                    <div className="border-t p-2 text-center text-muted-foreground text-sm">
                      Showing first 50 of {logsData.length} logs
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedNodeId && logsData.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="text-muted-foreground text-sm">
                  No logs available from this node. Make sure you have run the
                  workflow and the node has completed successfully.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setIsDialogOpen(false);
                setBaseDataName("");
                setSelectedNodeId("");
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={
                isCreating ||
                !baseDataName.trim() ||
                !selectedNodeId ||
                logsData.length === 0
              }
              onClick={handleCreateBaseData}
            >
              {isCreating ? "Creating..." : "Create Base Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeleteBaseDataId(null);
          }
        }}
        open={!!deleteBaseDataId}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Base Data</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this base data? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={handleDeleteBaseData}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

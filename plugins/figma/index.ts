import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { FigmaIcon } from "./icon";

const figmaPlugin: IntegrationPlugin = {
  type: "figma",
  label: "Figma",
  description: "Access Figma activity logs and file history",

  icon: FigmaIcon,

  formFields: [
    {
      id: "clientId",
      label: "Client ID",
      type: "text",
      placeholder: "Your Figma OAuth Client ID",
      configKey: "clientId",
      envVar: "FIGMA_CLIENT_ID",
      helpText: "OAuth Client ID from your Figma app. Get it from ",
      helpLink: {
        text: "figma.com/developers",
        url: "https://www.figma.com/developers/apps",
      },
    },
    {
      id: "clientSecret",
      label: "Client Secret",
      type: "password",
      placeholder: "Your Figma OAuth Client Secret",
      configKey: "clientSecret",
      envVar: "FIGMA_CLIENT_SECRET",
      helpText: "OAuth Client Secret from your Figma app",
    },
    {
      id: "accessToken",
      label: "Access Token",
      type: "password",
      placeholder: "OAuth access token (auto-populated after connecting)",
      configKey: "accessToken",
      envVar: "FIGMA_ACCESS_TOKEN",
      helpText: "This will be automatically set after OAuth authentication",
    },
    {
      id: "refreshToken",
      label: "Refresh Token",
      type: "password",
      placeholder: "OAuth refresh token (auto-populated)",
      configKey: "refreshToken",
      envVar: "FIGMA_REFRESH_TOKEN",
      helpText: "This will be automatically set after OAuth authentication",
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testFigma } = await import("./test");
      return testFigma;
    },
  },

  actions: [
    {
      slug: "get-activity-logs",
      label: "Get Activity Logs",
      description: "Fetch activity logs for a Figma file or organization",
      category: "Figma",
      stepFunction: "getActivityLogsStep",
      stepImportPath: "get-activity-logs",
      outputFields: [
        { field: "logs", description: "Array of activity log events" },
        { field: "count", description: "Number of events returned" },
        { field: "hasMore", description: "Whether there are more pages" },
        { field: "cursor", description: "Cursor for pagination" },
      ],
      configFields: [
        {
          key: "figmaFileUrl",
          label: "Figma File URL",
          type: "template-input",
          placeholder: "https://www.figma.com/design/... or {{NodeName.fileUrl}}",
          example: "https://www.figma.com/design/abc123/MyFile",
          required: true,
        },
        {
          key: "events",
          label: "Event Types",
          type: "select",
          defaultValue: "repo_merge_from_source",
          options: [
            { value: "repo_merge_from_source", label: "Branch Updated" },
            { value: "repo_merge_to_source", label: "Branch Merged" },
            { value: "branch_create", label: "Branch Created" },
            { value: "branch_delete", label: "Branch Deleted" },
            { value: "branch_archive", label: "Branch Archived" },
            { value: "branch_unarchive", label: "Branch Unarchived" },
            { value: "fig_file_create", label: "File Created" },
            { value: "fig_file_view", label: "File Viewed" },
            { value: "fig_file_rename", label: "File Renamed" },
            { value: "fig_file_trash", label: "File Trashed" },
            { value: "fig_file_restore", label: "File Restored" },
            { value: "fig_file_permanent_delete", label: "File Permanently Deleted" },
            { value: "fig_file_duplicate", label: "File Duplicated" },
            { value: "fig_file_export", label: "File Exported" },
            { value: "fig_file_member_add", label: "File Member Added" },
            { value: "fig_file_member_remove", label: "File Member Removed" },
            {
              value: "fig_file_member_permission_change",
              label: "File Member Permission Changed",
            },
            {
              value: "fig_file_link_access_change",
              label: "File Link Access Changed",
            },
            { value: "org_user_create", label: "User Added to Org" },
            { value: "org_user_delete", label: "User Removed from Org" },
            {
              value: "org_user_permission_change",
              label: "User Permission Changed",
            },
            { value: "team_create", label: "Team Created" },
            { value: "team_delete", label: "Team Deleted" },
            { value: "team_member_add", label: "Team Member Added" },
            { value: "team_member_remove", label: "Team Member Removed" },
            { value: "project_create", label: "Project Created" },
            { value: "project_delete", label: "Project Deleted" },
            { value: "project_member_add", label: "Project Member Added" },
            { value: "project_member_remove", label: "Project Member Removed" },
          ],
        },
        {
          key: "dateRange",
          label: "Date Range",
          type: "select",
          defaultValue: "7days",
          options: [
            { value: "7days", label: "Last 7 days" },
            { value: "30days", label: "Last 30 days" },
            { value: "90days", label: "Last 90 days" },
          ],
        },
        {
          key: "limit",
          label: "Limit",
          type: "number",
          defaultValue: "100",
          min: 1,
          placeholder: "Maximum events to return (1-1000)",
        },
        {
          key: "order",
          label: "Order",
          type: "select",
          defaultValue: "asc",
          options: [
            { value: "asc", label: "Oldest First (Ascending)" },
            { value: "desc", label: "Newest First (Descending)" },
          ],
        },
        {
          key: "cursor",
          label: "Pagination Cursor",
          type: "template-input",
          placeholder: "{{NodeName.cursor}} for pagination",
        },
      ],
    },
  ],
};

registerIntegration(figmaPlugin);

export default figmaPlugin;


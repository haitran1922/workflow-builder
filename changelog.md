# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.3] - 2025-01-09

### Added
- **Figma Detect Change Action**: New workflow action to detect new activity log items by comparing current logs with baseline data
  - Automatically finds and compares with the most recent "Get Activity Logs" node output
  - Returns new items that don't exist in the selected base data
  - Provides count and array of new log entries as output
- **Base Data Management System**: Complete infrastructure for storing and managing baseline activity log data
  - New `workflowBaseData` database table with JSONB storage for activity log arrays
  - Per-workflow base data storage with cascade deletion
  - Full CRUD API endpoints for base data operations
- **Base Data Selector UI Component**: Custom field type for selecting and managing base data
  - Radio button selection for choosing base data
  - Inline display of all log entries with full details (ID, Name, Timestamp, Action Type, Actor)
  - Create new base data from "Get Activity Logs" node outputs
  - Delete individual log entries from base data
  - Delete entire base data entries with confirmation
  - Simplified, direct UI without unnecessary clicks or nested structures
- **API Client Extensions**: New base data methods in workflow API client
  - `getAll()` - List all base data for a workflow
  - `getById()` - Get specific base data with full details
  - `create()` - Create new base data entry
  - `update()` - Update base data (used for removing individual log entries)
  - `delete()` - Delete base data entry
- **Database Migration**: New migration `0004_sturdy_runaways` for workflow base data table

### Changed
- **Plugin Registry**: Added `base-data-selector` as a new custom field type for action configuration
- **Action Config Renderer**: Integrated BaseDataSelectorField component for rendering base data selection UI
- **README**: Updated to include "Detect Change" in Figma integration features list

### Technical Details
- **Database Schema**: Added `workflowBaseData` table with relations to workflows
- **API Routes**: 
  - `GET /api/workflows/[workflowId]/base-data` - List base data
  - `POST /api/workflows/[workflowId]/base-data` - Create base data
  - `GET /api/workflows/[workflowId]/base-data/[baseDataId]` - Get base data details
  - `PATCH /api/workflows/[workflowId]/base-data/[baseDataId]` - Update base data
  - `DELETE /api/workflows/[workflowId]/base-data/[baseDataId]` - Delete base data
- **Step Function**: `detectChangeStep` in `plugins/figma/steps/detect-change.ts`
  - Queries execution logs to find previous "Get Activity Logs" node output
  - Compares current logs with base data using log IDs
  - Returns new items not present in base data

## [0.0.2] - 2025-12-08

### Added
- **Figma Activity Logs Integration**: Complete OAuth 2.0 integration with Figma's Activity Logs API
  - OAuth 2.0 flow with proper state management and HTTP Basic Authentication
  - Token exchange, refresh, and secure storage of access/refresh tokens
  - Enterprise plan requirements and proper error handling
- **Figma Activity Logs Workflow Node**: New workflow action for tracking Figma file activities
  - 30+ event types supported (branch operations, file changes, user/team events)
  - File-specific filtering to show only activity for specified Figma files
  - User-friendly date range selection (Last 7/30/90 days)
  - Pagination support with cursor-based navigation
  - Comprehensive error handling and validation
- **Enhanced Integration Management**:
  - Improved edit integration dialog to properly load existing credentials
  - OAuth connection flow with popup authentication
  - Better form validation and user feedback
- **Technical Infrastructure**:
  - New API routes: `/api/integrations/figma/oauth`, `/api/integrations/figma/callback`, `/api/integrations/figma/refresh`
  - Encrypted credential storage with proper type safety
  - URL parsing and validation for Figma file links
  - Activity log filtering and data transformation

### Fixed
- **Integration Edit Dialog**: Fixed issue where existing credentials weren't loading when editing integrations
- **OAuth State Management**: Improved OAuth flow to properly pass integration IDs through state parameters
- **Date Range Input**: Replaced confusing Unix timestamp inputs with user-friendly dropdown selections

### Security
- **OAuth 2.0 Compliance**: Proper implementation of Figma's OAuth 2.0 specification
- **Token Security**: Secure storage and refresh of OAuth tokens
- **Enterprise Access**: Proper validation for Enterprise plan requirements

## [0.0.1] - 2025-12-08

### Added
- Mandatory authentication requirement for all platform access
- Authentication gates on all pages (homepage, workflows list, workflow editor)
- Non-dismissible authentication dialog when authentication is required
- Support for `required` prop on `AuthDialog` component to prevent closing until authenticated

### Changed
- Authentication is now required before accessing any part of the platform
- Removed guest/anonymous access functionality
- Updated authentication flow to block UI interactions until user is authenticated

### Removed
- Anonymous authentication plugin and related functionality
- `anonymousClient()` plugin from auth client configuration
- `anonymous()` plugin from server auth configuration
- Anonymous session creation logic (`ensureSession` function)
- Anonymous user detection and migration code
- GitHub stars button from workflow toolbar
- "Deploy Your Own" button from workflow toolbar
- Anonymous user checks from API routes (now redundant since authentication is required)

### Security
- All routes now require authenticated sessions
- No anonymous or guest access allowed
- Workflow operations blocked until authentication is complete
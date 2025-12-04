# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-12-04

### Added
- Homepage authentication flow: unauthenticated users now see sign up dialog by default
- Workflow list display: authenticated users see their workflows displayed as interactive nodes on the canvas
- New workflow list node component for displaying workflows on the homepage canvas
- Support for "workflow" node type in workflow store and canvas
- Controlled dialog state support in AuthDialog component (open, onOpenChange, defaultMode props)

### Changed
- Homepage now checks authentication status and displays appropriate content
- Workflows are displayed in a grid layout on the canvas for easy navigation
- AuthDialog can now be opened programmatically with controlled state

### Removed
- GitHub Stars button removed from workflow toolbar and layout
- Deploy button removed from workflow toolbar
- GitHub Stars provider and loader components removed from layout

### Fixed
- Fixed hydration mismatch warnings by adding suppressHydrationWarning to DropdownMenuTrigger components
- Fixed Radix UI random ID generation causing server/client mismatch warnings
- Fixed AuthDialog not closing after successful authentication by properly implementing controlled component state with both open and onOpenChange props
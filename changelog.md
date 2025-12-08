# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
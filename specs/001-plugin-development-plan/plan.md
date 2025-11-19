# Implementation Plan: TagFolder Plugin Bug Elimination

**Branch**: `001-plugin-development-plan` | **Date**: 2025-11-19 | **Spec**: [specs/001-plugin-development-plan/spec.md](../specs/001-plugin-development-plan/spec.md)
**Input**: Feature specification from `/specs/001-plugin-development-plan/spec.md`

## Summary

The TagFolder plugin is at 85% completion with core functionality implemented but blocked by 134 TypeScript compilation errors and test failures. This plan focuses on systematic bug elimination to achieve production-ready status following Constitution v2.0.0 principles of manual-first organization, data integrity, and zero-config usability.

## Technical Context

**Language/Version**: TypeScript 4.9+ with strict mode enabled
**Primary Dependencies**: Obsidian API 1.4.0+, Vitest for testing, esbuild for bundling
**Storage**: File-based operations through Obsidian's Vault API
**Testing**: Vitest with performance benchmarking and integration testing
**Target Platform**: Obsidian plugin (cross-platform desktop application)
**Project Type**: Single TypeScript project with modular architecture
**Performance Goals**: Tag scanning <1s for ≤5KB/≤20 tags, memory usage <10MB idle
**Constraints**: Manual-only operations, no background processes, Constitution v2.0.0 compliance
**Scale/Scope**: Individual vault management, 24 source files, 134 TypeScript errors to resolve

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Compliance Analysis
- ✅ **Manual-First Organization**: All organization requires explicit user initiation
- ✅ **Data Integrity First**: Link preservation and conflict resolution implemented
- ✅ **Zero-Config Usability**: Default tag-to-path mapping without configuration
- ✅ **Manual Organization Control**: No background processes, user-initiated only
- ✅ **Non-Destructive Conflict Resolution**: Skip/rename/overwrite options with user consent

### Current Status
The current implementation follows Constitution v2.0.0 principles. All remaining bugs are technical (TypeScript compilation, test configuration) rather than constitutional violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-plugin-development-plan/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
└── contracts/           # Phase 1 output (/speckit.plan command)
```

### Source Code (repository root)

```text
src/
├── core/                 # Plugin initialization and lifecycle
│   └── plugin.ts
├── manual/               # Manual organization workflows
│   └── organizer.ts
├── scanning/             # Tag detection and path mapping
│   ├── tag-scanner.ts
│   └── path-mapper.ts
├── file-ops/             # File movement and link updates
│   ├── file-mover.ts
│   └── link-updater.ts
├── ui/                   # User interface components
│   ├── dialog.ts
│   ├── tag-selection-dialog.ts
│   ├── conflict-dialog.ts
│   ├── file-preview.ts
│   └── progress.ts
├── utils/                # Shared utilities
│   ├── events.ts
│   ├── errors.ts
│   ├── path-utils.ts
│   ├── validation.ts
│   └── validators.ts
├── types/                # TypeScript definitions
│   ├── entities.ts
│   ├── settings.ts
│   ├── scanner.ts
│   ├── contracts/
│   │   ├── link-updater.contract.ts
│   │   └── index.ts
│   └── index.ts
└── main.ts               # Plugin entry point

tests/
├── integration/          # End-to-end workflows
│   └── manual-organization.test.ts
├── performance/          # Performance benchmarking
│   ├── tag-scanning.test.ts
│   └── memory-usage.test.ts
├── unit/                 # Component testing
│   └── tag-scanner.test.ts
└── setup.ts              # Test configuration
```

**Structure Decision**: Single TypeScript project with modular architecture following Obsidian plugin patterns. The structure separates concerns with core initialization, manual workflows, scanning logic, file operations, UI components, and shared utilities.

## Current Bug Analysis

### Critical Issues Blocking Development

1. **134 TypeScript Compilation Errors**
   - Type mismatches in `link-updater.ts` (statistical calculations, wrong return types)
   - Missing interface properties in `manual/organizer.ts`
   - Validation error handling in `scanning/path-mapper.ts`
   - Missing exports and interface inconsistencies

2. **Test Infrastructure Failures**
   - Obsidian API module resolution issues
   - Missing test suites for performance benchmarks
   - Incorrect mock configurations

3. **Interface Inconsistencies**
   - `LinkUpdateConfig` vs `LinkUpdaterSettings` mismatch
   - Missing properties in dialog result types
   - Event payload structure mismatches

## Phase 0: Research & Architecture Review

### Bug Categories by Priority

#### **P0 - Blocking Compilation Errors** (67 errors)
- Core type system failures preventing builds
- Interface mismatches between modules
- Missing required properties

#### **P1 - Functional Integration Issues** (34 errors)
- Event system inconsistencies
- Dialog flow type problems
- Validation pipeline failures

#### **P2 - Test & Build Configuration** (33 errors)
- Test environment setup
- Obsidian API mocking
- Performance test configuration

### Root Cause Analysis

1. **Type System Strictness**: New `exactOptionalPropertyTypes` flag exposes existing sloppy typing
2. **Interface Drift**: Dependencies between modules have diverged during development
3. **Mock Incompleteness**: Test mocks don't fully represent Obsidian API
4. **Validation Gaps**: Error handling paths not properly typed

## Implementation Strategy

### Systematic Error Resolution Approach

1. **Foundation First**: Fix core type definitions and interfaces
2. **Dependency Chain**: Resolve errors in dependency order (types → core → features)
3. **Validation Pipeline**: Ensure error handling is consistent
4. **Test Integration**: Align mocks with real API contracts

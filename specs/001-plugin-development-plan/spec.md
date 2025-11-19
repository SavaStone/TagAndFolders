# TagFolder Plugin Specification

## Clarifications

### Session 2025-11-19
- Q: When scanning for tags, if the note has both a high-specificity nested tag like `#Projects/Clients/ClientA` and a broader tag like `#Active`, which should be the default recommendation when multiple tags are found? → A: Prioritize most specific/nested tag by default, but show all options
- Q: How should the plugin handle tag-to-path mapping when no explicit configuration exists? → B: Use intuitive defaults: convert tag directly to path (e.g., `#Projects/Clients/ClientA` → `Projects/Clients/ClientA/`)
- Q: What's the key difference between "show organization paths" and "organize current note" functions? → C: "Show paths" is preview-only (read-only), "Organize" performs the actual move (write action)
- Q: How should the plugin handle situations where the target folder already contains a file with the same name as the note being organized? → B: Show conflict resolution dialog with options: rename, overwrite (with warning), or cancel
- Q: What specific information should be shown in the conflict resolution dialog when a file with the same name already exists? → A: Show both files details with timestamps, sizes, and preview snippets
- Q: How should the plugin handle cases where tag detection fails or finds no tags in the current note? → B: Show helpful message with tag examples and quick add tag option

## Project Overview

TagFolder is an Obsidian plugin that organizes files into folders based on their tags through explicit user commands, with complete user control and manual initiation of all organization operations. This specification follows **Constitution v2.0.0** principles emphasizing **Manual-First Organization** (no automatic or background organization), **Data Integrity First** (never lose data), and **Zero-Config Usability** (works out-of-the-box).

## User Stories & Functional Requirements

### User Story 1: Manual Organization of Current Note (Priority: 1)
**As a** Obsidian user
**I want to** manually organize the current note based on its tags
**So that** I can quickly organize my notes without having to manually create folders and move files

**Acceptance Criteria:**
1. **Tag Detection**: TagScanner scans note for all tag types (nested tags, inline tags, YAML frontmatter, wiki-link tags)
2. **Path Mapping**: PathMapper determines target paths based on tag-to-path mappings
3. **Folder Creation**: Creates target folders if they don't exist
4. **Multi-tag Selection**: When multiple tags present, shows dialog with tag options and corresponding target paths, defaulting to most specific/nested tag
5. **File Movement**: Moves note to selected path and updates all links including wiki-links [[file]] and markdown links [text](path)
6. **Conflict Resolution**: Shows detailed dialog when target file exists with both files' information

**Conflict Resolution Dialog Details:**
```
File Conflict

A file with the same name already exists at the target location.

CURRENT NOTE:
• Name: My Project Notes.md
• Size: 2.4 KB
• Modified: 2 hours ago
• Preview: "Project requirements and implementation details..."

EXISTING FILE:
• Name: My Project Notes.md
• Size: 1.8 KB
• Modified: 3 days ago
• Preview: "Initial project brainstorming and ideas..."

[Overwrite] [Rename] [Cancel]
```

### User Story 2: Show Organization Paths (Priority: 1)
**As a** Obsidian user
**I want to** preview where a note can be organized based on its tags
**So that** I can make informed decisions about organization

**Acceptance Criteria:**
1. **Path Preview**: Shows side dialog with possible organization paths (preview-only, read-only)
2. **Tag-to-Path Display**: PathMapper lists each tag and its corresponding target path
3. **English UI**: All dialog text in English
4. **No File Changes**: Does not modify any files or folders (preview only)

**Example Dialog:**
```
You can move this note to the following paths:
- Projects/Clients/ClientA/
- Active/
```

## Data Model

### Core Entities
- **TagPathMapping**: Maps tags to folder paths
- **FileOperation**: Represents file movement operations
- **WikiLink**: Links that need updating after file moves
- **ConflictResolution**: Strategies for handling file conflicts

### Tag Types Supported
- YAML frontmatter tags
- Inline hashtags (#tag)
- Nested tags (#parent/child)
- Wiki-link tags ([[#tag]])

## User Interface Requirements

### Manual Organization Dialog
- Modal dialog showing tag options
- Preview of target path for each tag
- Clear selection mechanism
- Cancel/confirm actions

### Organization Paths Display
- Side dialog/slide-out panel
- List of possible paths
- English text only

## Non-Functional Requirements

### Performance
- Tag scanning should complete within 1 second for typical notes (≤5KB content, ≤20 tags)
  - **Measurement**: Use `performance.now()` to measure scanning duration on test files with known tag counts
  - **Testing**: Create performance test files ranging from 1KB-10KB with 5-25 tags
  - **Acceptance**: 95th percentile ≤ 1000ms on typical vault hardware
- Folder creation should complete within 100ms for nested paths up to 5 levels deep
  - **Measurement**: Measure time from folder creation request to completion
  - **Testing**: Test paths with varying depths (1-7 levels) and cross-platform scenarios
  - **Acceptance**: 95th percentile ≤ 100ms on all supported platforms
- Dialog response should be under 100ms from user action to UI update
  - **Measurement**: Time from click/input to dialog visual update
  - **Testing**: Test with various dialog sizes and system load conditions
  - **Acceptance**: 95th percentile ≤ 100ms perceived response time
- Memory usage should stay under 10MB during idle operation
  - **Measurement**: Use `process.memoryUsage().heapUsed` for Node.js measurements
  - **Testing**: Monitor memory over extended idle periods (30+ minutes)
  - **Acceptance**: Baseline + peak usage ≤ 10MB total

### Safety
- Never overwrite existing files without user consent
- Create backups before major operations
- Validate all paths before operations

### Usability
- Zero-config default behavior
  - **Measurement**: Plugin works immediately after installation without any configuration
  - **Testing**: Fresh install test with default vault to verify tag-to-path mapping works
  - **Acceptance**: User can successfully organize a note within 3 minutes of installation
- Clear error messages
  - **Measurement**: Error messages include specific action required and context
  - **Testing**: Test all error scenarios with mock failures and verify message clarity
  - **Acceptance**: 90% of users can understand and act on error messages without additional help
- Intuitive dialog flows
  - **Measurement**: Time to complete dialog task and user satisfaction scores
  - **Testing**: User testing with 5+ participants measuring task completion rates
  - **Acceptance**: ≥85% task completion rate with ≤2 clicks per decision point

## Integration Points

### Obsidian API
- File system operations
- Cache management
- Event handling

### Configuration
- Tag-to-path mapping settings (with intelligent defaults: tag → direct path conversion)
- User preferences
- Conflict resolution strategies

## Edge Cases & Error Handling

- **Notes with no tags**: Show helpful educational dialog with examples and quick add tag option
- Conflicting file paths
- Permission denied errors
- Invalid tag formats
- Network/sync folder scenarios

**No Tags Dialog Example:**
```
No Tags Found

This note doesn't contain any tags for organization.

HOW TO ADD TAGS:
• In YAML frontmatter: tags: [project, active]
• Inline: #project #active
• Wiki-links: [[#project]]

[Add Tag] [Learn More] [Cancel]
```

**Add Tag Functionality** (Deferred to Enhancement Phase):
- When "Add Tag" is clicked, show inline tag input field
- Support auto-completion from existing vault tags
- Allow multiple tag addition before closing dialog
- Tags are added to YAML frontmatter or as inline hashtags based on user preference
- After tag addition, automatically refresh organization options

*Note: This functionality is deferred to enhance initial focus on core manual organization workflows.*

## Technical Constraints

### Tag Extraction
- Support all Obsidian tag formats
- Handle special characters in tags
- Parse malformed YAML gracefully

### Path Operations
- Handle cross-platform path differences
- Create nested directories
- Preserve file timestamps

## Out of Scope

**Constitution v2.0.0 Manual-First Organization Compliance:**
- **Automatic background organization** - prohibited by Constitution v2.0.0 Manual-First Organization principle
- **Scheduled organization** - prohibited by Constitution v2.0.0 Manual Organization Control principle
- **Real-time monitoring** - prohibited by Constitution v2.0.0 Manual-First Organization principle
- **Any organization without explicit user initiation** - prohibited by Constitution v2.0.0

**Additional Scope Limitations:**
- File content modification beyond link updates
- Integration with external services
- Multi-vault synchronization

## Success Metrics

- Users can organize current note within 3 clicks
  - **Definition**: A "click" counts as any user action (button press, selection, confirmation)
  - **Measurement**: Track click count from command execution to file movement completion
  - **Edge Cases**: Confirmation dialogs count as 1 click, conflict resolution counts separately
- Zero data loss during operations
  - **Measurement**: 100% file integrity preservation across all test scenarios
  - **Testing**: Verify file contents, metadata, and links remain intact after operations
- Support for all common tag formats
  - **Formats**: YAML frontmatter tags, inline hashtags (#tag), nested tags (#parent/child), wiki-link tags ([[#tag]])
  - **Measurement**: 100% detection accuracy across format combinations
- Clear visibility into organization outcomes
  - **Measurement**: User can see before/after state and understand all changes made
  - **Testing**: Verify preview functionality and operation summaries are comprehensive
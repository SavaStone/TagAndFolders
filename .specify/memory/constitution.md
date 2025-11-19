<!--
Sync Impact Report:
- Version Change: 1.1.0 -> 2.0.0
- Modified Principles: I. Automated Organization -> I. Manual-First Organization (Fundamental change from automation to manual control)
- Added Sections: N/A (Manual Organization Control already existed)
- Removed Sections: Automated organization capabilities (removed from core principles)
- Templates Requiring Updates: ⚠ spec.md (remove auto-organization features), ⚠ quickstart.md (update to manual-only workflow)
- Follow-up TODOs: Update specification to remove automatic organization features
-->

# TagFolder Plugin Constitution

## Core Principles

### I. Manual-First Organization
The core value is user control. The plugin provides manual organization tools where users explicitly choose when and how to organize notes based on tags. All organization requires user initiation and approval. Tag-to-path mapping must be flexible and deterministic.

### II. Data Integrity First
Never lose data. Link preservation (wiki-links and markdown links) is non-negotiable. Operations must be safe; if a move is ambiguous or dangerous, prompt the user or skip.

### III. Zero-Config Usability
The plugin must be usable immediately upon installation. Default behaviors (e.g., `#tag` -> `tag/`) must work without configuration. Complex settings are opt-in.

### IV. Manual Organization Control
Manual organization commands are the ONLY way to organize notes. Users retain complete control and must explicitly initiate every organization operation. No background or automatic organization is permitted.

### V. Non-Destructive Conflict Resolution
When file paths conflict, the plugin must offer safe resolution strategies (skip, rename, subfolder) and never overwrite files silently. Exclusions must be respected strictly.

## Plugin Architecture

Built on the Obsidian API. Must respect Obsidian's file system events. Code should be modular (separating logic for scanning, moving, and link updating).

## Installation & Distribution

Supports BRAT (Beta) and Manual installation. Releases must include `main.js`, `manifest.json`, and `styles.css`.

## Governance

Constitution supersedes all other practices. Amendments require documentation, approval, and a migration plan.

**Version**: 2.0.0 | **Ratified**: 2025-11-19 | **Last Amended**: 2025-11-19

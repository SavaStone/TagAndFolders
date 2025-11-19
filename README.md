# TagFolder Plugin for Obsidian

A manual-only file organization plugin for Obsidian that helps you organize your notes into folders based on their tags, with complete user control and link preservation.

## Features

- **Manual-Only Organization**: No automatic file movements - you're always in control
- **Tag Detection**: Scans for all tag types (YAML frontmatter, inline hashtags, wiki-link tags, nested tags)
- **Smart Path Mapping**: Intelligent tag-to-path conversion with customizable mappings
- **Link Preservation**: Automatically updates all wiki-links and markdown links after moving files
- **Conflict Resolution**: Detailed conflict dialogs with multiple resolution options
- **Backup & Rollback**: Creates backups before major operations with rollback capability
- **Preview Mode**: See where files can be organized before making changes
- **Zero-Config Setup**: Works out of the box with sensible defaults

## User Stories

### User Story 1: Manual Organization of Current Note
As an Obsidian user, I want to manually organize the current note based on its tags, so that I can quickly organize my notes without having to manually create folders and move files.

### User Story 2: Show Organization Paths
As an Obsidian user, I want to preview where a note can be organized based on its tags, so that I can make informed decisions about organization.

## Installation

1. Download the latest release from the [Releases](https://github.com/your-username/tagfolder-plugin/releases) page
2. Extract the contents to your vault's `plugins/tagfolder-plugin/` directory
3. Enable the plugin in Obsidian's Community Plugins settings

## Development

### Prerequisites

- Node.js 16.0.0 or higher
- npm, yarn, or pnpm
- Obsidian desktop app (for development)

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/tagfolder-plugin.git
cd tagfolder-plugin

# Install dependencies
npm install

# Start development mode
npm run dev
```

### Building

```bash
# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Project Structure

```
src/
├── types/          # TypeScript interfaces and types
├── utils/          # Utility functions and helpers
├── scanning/       # Tag scanning and detection
├── file-ops/       # File operations and movement
├── ui/            # User interface components
├── manual/        # Manual organization workflows
└── core/          # Core plugin functionality

tests/
├── unit/          # Unit tests
├── integration/   # Integration tests
└── contract/      # API contract tests
```

## Configuration

The plugin provides a settings interface where you can:

- Configure tag-to-path mappings
- Set conflict resolution preferences
- Customize scanning options
- Manage backup settings

## Constitution

This plugin follows the **Manual-Only Organization v2.0.0** constitution:

1. **Manual-First Organization**: All file operations require explicit user initiation
2. **Data Integrity First**: Link preservation is non-negotiable
3. **Zero-Config Usability**: Intuitive defaults work immediately
4. **Manual Organization Control**: Users explicitly initiate every operation
5. **Non-Destructive Conflict Resolution**: Detailed dialogs, no silent overwrites

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Obsidian team for the amazing note-taking application
- The community for feedback and suggestions
- Contributors who help improve this plugin
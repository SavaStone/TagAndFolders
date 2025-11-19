# TagFolder Plugin Quickstart Guide

## Overview

TagFolder is an Obsidian plugin that helps you organize your files into folders based on their tags through explicit manual commands. Take control of your organization by choosing exactly when and how to organize each note!

## Installation

### Option 1: BRAT (Beta Testing)
1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) in Obsidian
2. Open Command Palette (`Ctrl/Cmd + P`)
3. Run "BRAT: Add a beta plugin for testing"
4. Enter repository URL: `https://github.com/your-username/tagfolder-plugin`
5. Wait for installation to complete

### Option 2: Manual Installation
1. Download the latest release from GitHub
2. Extract the ZIP file to your vault's `.obsidian/plugins/tagfolder/` directory
3. Restart Obsidian or reload plugins (`Ctrl/Cmd + R`)

## First Run Setup

### Step 1: Enable the Plugin
1. Go to **Settings → Community Plugins**
2. Find "TagFolder" in the installed plugins list
3. Toggle the plugin to enable it

### Step 2: Initial Configuration
1. Open **Settings → TagFolder**
2. Configure your preferred conflict resolution strategy (default: "Prompt")
3. Review manual organization settings

## Manual Organization Workflow

TagFolder puts you in complete control. Here's how manual organization works:

### Core Commands
- **Organize Current Note**: Manually organize the file you're currently editing
- **Show Organization Paths**: Preview where your current note can be organized
- **Manual Batch Organization**: Select multiple notes for organization

### Default Tag-to-Path Mappings
With zero-config settings, TagFolder uses intuitive defaults:
- `#project` → `Projects/`
- `#meeting` → `Meetings/`
- `#reference` → `References/`
- `#idea` → `Ideas/`

## Quick Examples

### Example 1: Manual Organization of Current Note
You're working on a note and want to organize it:

1. **Create a note with tags**:
```markdown
---
tags: [project, active]
---

# My Awesome Project

This is a project note that needs organization.
```

2. **Open Command Palette** (`Ctrl/Cmd + P`)

3. **Run "TagFolder: Organize Current Note"**

4. **Choose from options** (if multiple tags):
   - `Projects/` (from #project tag)
   - `Active/` (from #active tag)

5. **Confirm organization** - TagFolder moves the file to your chosen location

### Example 2: Preview Before Organizing
Want to see where a note could go before organizing?

1. **Open Command Palette** (`Ctrl/Cmd + P`)

2. **Run "TagFolder: Show Organization Paths"**

3. **View the side panel**:
```
You can move this note to the following paths:
- Projects/Active/My Awesome Project.md
- Active/My Awesome Project.md
```

4. **Close panel** - No files are moved, this is preview-only

### Example 3: Handling Multiple Tags
Your note has several tag options:

```markdown
# Meeting Notes

Attended the quarterly review #meeting #work

Action items:
- Follow up with team #todo
- Research competitors #project/competitive
```

**Organization Dialog**:
```
Choose organization path:

1. Projects/Competitive/Meeting Notes.md  (specific tag #project/competitive)
2. Meetings/Meeting Notes.md              (broader tag #meeting)
3. Work/Meeting Notes.md                  (broader tag #work)
4. Todo/Meeting Notes.md                   (broader tag #todo)

[Select Path] [Cancel]
```

## Working with Nested Tags

TagFolder supports hierarchical tags for precise organization:

### Example: Nested Tag Structure
```markdown
# Research Paper

Working on machine learning #project/ml/active

Related to neural networks #research/deep-learning
```

**Available Paths**:
- `Projects/ML/Active/Research Paper.md` (most specific)
- `Research/Deep-Learning/Research Paper.md` (alternative)

**TagFolder prioritizes the most specific path** (`#project/ml/active`) but shows all options.

## Advanced Configuration

### Custom Tag Mappings
Create your own organization rules:

1. **Open Settings → TagFolder → Tag Mappings**

2. **Add Custom Mapping**:
   - **Tag**: `#client`
   - **Path**: `Clients/`
   - **Priority**: 5
   - **Enabled**: ✓

3. **Example Custom Mappings**:
   - `#project/active` → `Projects/Active/`
   - `#learning/course` → `Learning/Courses/`
   - `#personal/journal` → `Personal/Journal/`

### Conflict Resolution Strategies
Choose how to handle file conflicts:

| Strategy | Behavior | Best For |
|----------|----------|----------|
| **Prompt** | Ask user what to do | Maximum control |
| **Rename** | Add suffix to new file | Avoiding data loss |
| **Skip** | Leave file where it is | Safe defaults |
| **Subfolder** | Move to conflict/ subfolder | Organizing conflicts |

## File Management Features

### Conflict Resolution Dialog
When a target file exists, TagFolder shows detailed information:

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

### Link Preservation
TagFolder automatically updates all links when moving files:
- **Wiki-links**: `[[File Name]]`
- **Wiki-links with aliases**: `[[File Name|Alias]]`
- **Wiki-links to headings**: `[[File Name#Heading]]`
- **Embedded files**: `![[Image.png]]`
- **Markdown links**: `[Text](path/to/file)`

## Working with Different Tag Formats

TagFolder supports all Obsidian tag formats:

### YAML Frontmatter Tags
```markdown
---
tags: [project, active, urgent]
---
```

### Inline Hashtags
```markdown
Working on #project tasks

#urgent deadline approaching
```

### Wiki-Link Tags
```markdown
Related to [[#project]] main goal

See also [[#project/deadline]]
```

## Error Handling & Help

### No Tags Found
If a note has no tags, TagFolder provides helpful guidance:

```
No Tags Found

This note doesn't contain any tags for organization.

HOW TO ADD TAGS:
• In YAML frontmatter: tags: [project, active]
• Inline: #project #active
• Wiki-links: [[#project]]

[Add Tag] [Learn More] [Cancel]
```

### Common Issues
- **Permission Denied**: Check file permissions and try again
- **Invalid Tags**: Ensure tags start with # and contain valid characters
- **Long Paths**: Windows has path length limits - use shorter names

## Best Practices

### Effective Tagging
1. **Use consistent tag formats**: Stick to one style per vault
2. **Create hierarchies**: Use `#category/subcategory` for organization
3. **Be specific**: `#project/client-name` is better than just `#project`
4. **Plan ahead**: Think about your folder structure when creating tags

### Manual Organization Workflow
1. **Preview first**: Use "Show Organization Paths" before moving
2. **Check conflicts**: Review the conflict resolution dialog carefully
3. **Test with small batches**: Start with a few files to validate your mappings
4. **Backup important files**: Before major reorganization

## Getting Help

### Commands
- `Ctrl/Cmd + P` → "TagFolder: *" for all available commands

### Logs
Enable debug logging for troubleshooting:
1. **Settings → TagFolder → Advanced → Debug**
2. Enable "Enable debug logging"
3. Check logs at `.obsidian/plugins/tagfolder/debug.log`

### Community
- Report issues on GitHub
- Share your tag mapping configurations
- Request features and improvements

---

**Happy organizing!** 🎯

With TagFolder, your tags become powerful organization tools that you control completely. Manual organization means no surprises - every file moves exactly where and when you choose.
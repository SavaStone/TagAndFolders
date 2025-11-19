# Link Updater Module API Contract

## Overview
The Link Updater module is responsible for updating wiki-links and markdown links when files are moved or renamed. It ensures data integrity by maintaining link consistency throughout the vault.

## Public Interface

### ILinkUpdater

```typescript
interface ILinkUpdater {
  /**
   * Update links after file operations
   * @param fileOperations Completed file operations
   * @param options Update options
   * @returns Promise resolving to update results
   */
  updateLinks(fileOperations: FileOperation[], options?: UpdateOptions): Promise<UpdateResult>;

  /**
   * Find all links to a specific file
   * @param filePath Path to the target file
   * @param options Search options
   * @returns Promise resolving to found links
   */
  findLinksToFile(filePath: string, options?: LinkSearchOptions): Promise<FoundLink[]>;

  /**
   * Update links in a specific file
   * @param sourceFile Path to the file containing links
   * @param updates Array of link updates to apply
   * @param options Update options
   * @returns Promise resolving to update result
   */
  updateLinksInFile(sourceFile: string, updates: LinkUpdate[], options?: FileUpdateOptions): Promise<FileUpdateResult>;

  /**
   * Validate links across the vault
   * @param options Validation options
   * @returns Promise resolving to validation results
   */
  validateLinks(options?: ValidationOptions): Promise<ValidationResult>;

  /**
   * Generate link update preview
   * @param fileOperations File operations to preview updates for
   * @param options Preview options
   * @returns Promise resolving to preview results
   */
  previewUpdates(fileOperations: FileOperation[], options?: PreviewOptions): Promise<LinkUpdatePreview>;

  /**
   * Check if link updates are currently running
   */
  get isUpdating(): boolean;

  /**
   * Cancel current link update operation
   */
  cancelUpdates(): void;
}
```

## Data Types

### UpdateOptions
```typescript
interface UpdateOptions {
  /** Types of links to update */
  linkTypes?: LinkType[];
  /** Update links in subdirectories recursively */
  recursive?: boolean;
  /** Skip files matching patterns */
  skipPatterns?: string[];
  /** Include only files matching patterns */
  includePatterns?: string[];
  /** Process in batch mode */
  batchSize?: number;
  /** Continue on error */
  continueOnError?: boolean;
  /** Create backup before updates */
  createBackup?: boolean;
  /** Progress callback */
  onProgress?: (progress: UpdateProgress) => void;
}
```

### LinkSearchOptions
```typescript
interface LinkSearchOptions {
  /** Search recursively in subdirectories */
  recursive?: boolean;
  /** Include broken links */
  includeBroken?: boolean;
  /** Include unresolved links */
  includeUnresolved?: boolean;
  /** Maximum depth for recursive search */
  maxDepth?: number;
  /** Files to exclude from search */
  excludeFiles?: string[];
}
```

### FoundLink
```typescript
interface FoundLink {
  /** Link ID */
  id: string;
  /** File containing the link */
  sourceFile: string;
  /** Target file path */
  targetFile: string;
  /** Link text/alias */
  linkText?: string;
  /** Link type */
  type: LinkType;
  /** Link location in source file */
  location: LinkLocation;
  /** Whether link is currently valid */
  isValid: boolean;
  /** Link validation details */
  validation?: LinkValidation;
}
```

### LinkLocation
```typescript
interface LinkLocation {
  /** Line number (1-based) */
  line: number;
  /** Column position (1-based) */
  column: number;
  /** Link length in characters */
  length: number;
  /** Context around the link */
  context: {
    before: string;
    after: string;
    fullLine: string;
  };
}
```

### LinkType
```typescript
type LinkType =
  | 'wiki-link'           // [[File Name]]
  | 'wiki-link-alias'     // [[File Name|Alias]]
  | 'wiki-link-heading'   // [[File Name#Heading]]
  | 'wiki-link-block'     // ![[File Name]] (embeds)
  | 'markdown-link'       // [Text](path)
  | 'markdown-reference'  // [Text][reference]
  | 'attachment'          // Direct file paths
  | 'relative-path';      // ./relative/path
```

### LinkUpdate
```typescript
interface LinkUpdate {
  /** Update ID */
  id: string;
  /** Original link text */
  originalText: string;
  /** New link text */
  newText: string;
  /** Link type */
  type: LinkType;
  /** Original target path */
  originalTarget: string;
  /** New target path */
  newTarget: string;
  /** Link location */
  location: LinkLocation;
  /** Update reason */
  reason: UpdateReason;
}
```

### UpdateReason
```typescript
type UpdateReason =
  | 'file-moved'          // Target file was moved
  | 'file-renamed'        // Target file was renamed
  | 'file-deleted'        // Target file was deleted
  | 'path-normalization'  // Path format standardization
  | 'alias-update'        // Link alias changed
  | 'heading-change'      // Target heading changed
  | 'manual-update';      // User requested update
```

### LinkValidation
```typescript
interface LinkValidation {
  /** Whether link is valid */
  valid: boolean;
  /** Validation timestamp */
  validatedAt: Date;
  /** Validation error if invalid */
  error?: {
    type: 'file-not-found' | 'heading-not-found' | 'permission-denied' | 'other';
    message: string;
    details?: any;
  };
  /** File checksum when validated */
  fileChecksum?: string;
}
```

### UpdateResult
```typescript
interface UpdateResult {
  /** Update session ID */
  sessionId: string;
  /** Total links found */
  totalLinksFound: number;
  /** Links processed */
  linksProcessed: number;
  /** Links successfully updated */
  linksUpdated: number;
  /** Files modified */
  filesModified: number;
  /** Links that failed to update */
  failedUpdates: FailedUpdate[];
  /** Files that couldn't be processed */
  unprocessableFiles: string[];
  /** Update statistics */
  statistics: UpdateStatistics;
  /** Backup information */
  backup?: BackupInfo;
  /** Session timestamps */
  startedAt: Date;
  completedAt?: Date;
}
```

### FailedUpdate
```typescript
interface FailedUpdate {
  /** Link ID */
  linkId: string;
  /** Source file */
  sourceFile: string;
  /** Original link text */
  originalText: string;
  /** Error information */
  error: {
    type: 'parse-error' | 'write-error' | 'permission-error' | 'other';
    message: string;
    details?: any;
  };
  /** Timestamp */
  timestamp: Date;
}
```

### UpdateStatistics
```typescript
interface UpdateStatistics {
  /** Links updated by type */
  updatesByType: Record<LinkType, number>;
  /** Processing time in milliseconds */
  processingTime: number;
  /** Average links per file */
  averageLinksPerFile: number;
  /** Largest file processed */
  largestFile: {
    path: string;
    linkCount: number;
  };
  /** Most common link type */
  mostCommonLinkType: LinkType;
}
```

### ValidationResult
```typescript
interface ValidationResult {
  /** Validation session ID */
  validationId: string;
  /** Total files checked */
  filesChecked: number;
  /** Total links found */
  totalLinks: number;
  /** Valid links */
  validLinks: number;
  /** Broken links */
  brokenLinks: BrokenLink[];
  /** Unresolved links */
  unresolvedLinks: UnresolvedLink[];
  /** Validation summary */
  summary: ValidationSummary;
  /** Validation timestamp */
  validatedAt: Date;
}
```

### BrokenLink
```typescript
interface BrokenLink {
  /** Link ID */
  id: string;
  /** Source file */
  sourceFile: string;
  /** Target file path */
  targetPath: string;
  /** Link text */
  linkText?: string;
  /** Link location */
  location: LinkLocation;
  /** Error details */
  error: {
    type: 'file-not-found' | 'heading-not-found' | 'attachment-missing';
    message: string;
  };
  /** Suggested fixes */
  suggestions: LinkFix[];
}
```

### UnresolvedLink
```typescript
interface UnresolvedLink {
  /** Link ID */
  id: string;
  /** Source file */
  sourceFile: string;
  /** Link text */
  linkText: string;
  /** Link location */
  location: LinkLocation;
  /** Reason link couldn't be resolved */
  reason: 'ambiguous-match' | 'multiple-matches' | 'circular-reference' | 'other';
  /** Possible matches */
  possibleMatches?: PossibleMatch[];
}
```

### LinkFix
```typescript
interface LinkFix {
  /** Fix type */
  type: 'create-file' | 'move-file' | 'update-link' | 'delete-link';
  /** Fix description */
  description: string;
  /** Confidence level (0-1) */
  confidence: number;
  /** Automatic fix available */
  autoFixable: boolean;
  /** Fix parameters */
  parameters?: Record<string, any>;
}
```

## Events

### LinkUpdaterEvents
```typescript
interface LinkUpdaterEvents {
  /** Emitted when link updates start */
  'updates-started': (sessionId: string) => void;

  /** Emitted when link updates complete */
  'updates-completed': (result: UpdateResult) => void;

  /** Emitted when link updates fail */
  'updates-failed': (error: Error, sessionId: string) => void;

  /** Emitted during update progress */
  'updates-progress': (progress: UpdateProgress) => void;

  /** Emitted when a file is processed */
  'file-processed': (filePath: string, linkCount: number) => void;

  /** Emitted when a link is updated */
  'link-updated': (linkId: string, sourceFile: string) => void;

  /** Emitted when broken link is found */
  'broken-link-found': (brokenLink: BrokenLink) => void;

  /** Emitted when updates are cancelled */
  'updates-cancelled': (sessionId: string) => void;
}
```

## Implementation Requirements

### Accuracy Requirements
- 100% accuracy for link detection and updates
- Preserve original link formatting and whitespace
- Handle complex link patterns correctly
- Support all Obsidian link syntax variations

### Performance Requirements
- Process 1000 links in under 2 seconds
- Handle files with thousands of links efficiently
- Progress updates at least every 50 links
- Cancellation must respond within 200ms

### Safety Requirements
- Create backups before modifying files
- Validate updates before applying them
- Never corrupt file structure
- Preserve file encoding and line endings

### Compatibility Requirements
- Support all Obsidian link formats
- Handle special characters in file names
- Work with various file encodings
- Respect user link preferences

## Testing Requirements

### Unit Tests
- Link detection for all link types
- Link text replacement accuracy
- Edge cases (empty links, malformed links)
- Performance with large files

### Integration Tests
- End-to-end link update workflows
- Integration with file operations
- Complex vault scenarios
- Cross-platform compatibility

### Test Data
- Files with various link types
- Broken and ambiguous links
- Special characters and Unicode
- Large files with many links

## Configuration

### Default Settings
```typescript
const defaultUpdateSettings = {
  linkTypes: ['wiki-link', 'wiki-link-alias', 'wiki-link-heading', 'wiki-link-block', 'markdown-link'],
  recursive: true,
  batchSize: 100,
  continueOnError: false,
  createBackup: true
};
```

### Environment Variables
- `TAGFOLDER_LINK_UPDATE_TIMEOUT`: Link update timeout in milliseconds
- `TAGFOLDER_MAX_LINKS_PER_FILE`: Maximum links to process per file
- `TAGFOLDER_BACKUP_RETENTION`: Backup retention period in days

## Security Considerations

### Path Validation
- Validate all file paths before operations
- Prevent directory traversal in link targets
- Sanitize link text and aliases

### File Safety
- Verify file permissions before updates
- Handle file locking scenarios
- Preserve file metadata when possible

## API Examples

### Basic Link Updates
```typescript
const linkUpdater = new LinkUpdater(vault);

const result = await linkUpdater.updateLinks(fileOperations, {
  createBackup: true,
  onProgress: (progress) => {
    console.log(`Updated ${progress.completed}/${progress.total} links`);
  }
});

console.log(`Updated ${result.linksUpdated} links in ${result.filesModified} files`);
```

### Find Links to File
```typescript
const links = await linkUpdater.findLinksToFile('Projects/Active/MyProject.md', {
  recursive: true,
  includeBroken: true
});

console.log(`Found ${links.length} links to file`);
```

### Link Validation
```typescript
const validation = await linkUpdater.validateLinks({
  recursive: true
});

if (validation.brokenLinks.length > 0) {
  console.warn(`Found ${validation.brokenLinks.length} broken links`);
  // Show broken links to user
}
```

### Preview Updates
```typescript
const preview = await linkUpdater.previewUpdates(fileOperations);

console.log(`Will update ${preview.totalUpdates} links`);
console.log(`Files to modify: ${preview.filesToModify.length}`);

if (preview.riskLevel === 'high') {
  // Show preview to user for confirmation
}
```
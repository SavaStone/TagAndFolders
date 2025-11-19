# Organizer Module API Contract

## Overview
The Organizer module handles file movement and organization operations. It's responsible for executing the file operations determined by the scanner based on tag-to-path mappings.

## Public Interface

### IFileOrganizer

```typescript
interface IFileOrganizer {
  /**
   * Organize files based on tag mappings
   * @param operations Array of file operations to execute
   * @param options Organization options
   * @returns Promise resolving to organization results
   */
  organizeFiles(operations: FileOperation[], options?: OrganizeOptions): Promise<OrganizeResult>;

  /**
   * Execute a single file operation
   * @param operation Single file operation to execute
   * @param options Operation options
   * @returns Promise resolving to operation result
   */
  executeOperation(operation: FileOperation, options?: OperationOptions): Promise<OperationResult>;

  /**
   * Preview operations without executing them
   * @param operations Array of operations to preview
   * @returns Promise resolving to preview results
   */
  previewOperations(operations: FileOperation[]): Promise<PreviewResult>;

  /**
   * Resolve file conflicts using specified strategy
   * @param conflicts Array of file conflicts to resolve
   * @param strategy Resolution strategy
   * @returns Promise resolving to conflict resolution results
   */
  resolveConflicts(conflicts: FileConflict[], strategy: ConflictResolution['strategy']): Promise<ConflictResolutionResult>;

  /**
   * Rollback previously executed operations
   * @param operationIds Array of operation IDs to rollback
   * @returns Promise resolving to rollback results
   */
  rollbackOperations(operationIds: string[]): Promise<RollbackResult>;

  /**
   * Check if organization is currently running
   */
  get isOrganizing(): boolean;

  /**
   * Cancel current organization operation
   */
  cancelOrganization(): void;
}
```

## Data Types

### OrganizeOptions
```typescript
interface OrganizeOptions {
  /** Default conflict resolution strategy */
  conflictResolution?: ConflictResolution['strategy'];
  /** Execute in dry-run mode (preview only) */
  dryRun?: boolean;
  /** Batch size for processing */
  batchSize?: number;
  /** Continue on error */
  continueOnError?: boolean;
  /** Show progress notifications */
  showProgress?: boolean;
  /** Progress callback */
  onProgress?: (progress: OrganizeProgress) => void;
  /** Confirmation callback for conflicts */
  onConflict?: (conflict: FileConflict) => Promise<ConflictResolution['strategy']>;
}
```

### OperationOptions
```typescript
interface OperationOptions {
  /** Skip conflict resolution */
  skipConflicts?: boolean;
  /** Force operation (override conflicts) */
  force?: boolean;
  /** Create parent directories if needed */
  createParents?: boolean;
  /** Preserve timestamps */
  preserveTimestamps?: boolean;
  /** Operation timeout in milliseconds */
  timeout?: number;
}
```

### OrganizeResult
```typescript
interface OrganizeResult {
  /** Organization session ID */
  sessionId: string;
  /** Total operations processed */
  totalOperations: number;
  /** Successful operations */
  successfulOperations: number;
  /** Failed operations */
  failedOperations: number;
  /** Skipped operations */
  skippedOperations: number;
  /** Operation results */
  results: OperationResult[];
  /** Conflicts encountered */
  conflicts: FileConflict[];
  /** Errors encountered */
  errors: OrganizationError[];
  /** Session statistics */
  statistics: OrganizationStatistics;
  /** Start and end timestamps */
  startedAt: Date;
  completedAt?: Date;
}
```

### OperationResult
```typescript
interface OperationResult {
  /** Operation ID */
  operationId: string;
  /** Operation type */
  type: FileOperation['type'];
  /** Source file path */
  source: string;
  /** Target file path */
  target: string;
  /** Operation status */
  status: 'success' | 'failed' | 'skipped' | 'cancelled';
  /** Execution time in milliseconds */
  executionTime: number;
  /** Error message if failed */
  error?: string;
  /** Conflicts encountered */
  conflicts: FileConflict[];
  /** Files affected */
  affectedFiles: string[];
  /** Timestamp */
  timestamp: Date;
}
```

### FileConflict
```typescript
interface FileConflict {
  /** Conflict ID */
  id: string;
  /** Type of conflict */
  type: 'target-exists' | 'target-read-only' | 'permission-denied' | 'path-too-long' | 'other';
  /** Operation that caused conflict */
  operation: FileOperation;
  /** Conflicting file path */
  filePath: string;
  /** Conflict details */
  details: ConflictDetails;
  /** Suggested resolutions */
  suggestions: ConflictSuggestion[];
  /** Timestamp */
  timestamp: Date;
}
```

### ConflictDetails
```typescript
interface ConflictDetails {
  /** Existing file information */
  existingFile?: {
    path: string;
    size: number;
    modifiedAt: Date;
    checksum?: string;
  };
  /** New file information */
  newFile?: {
    path: string;
    size: number;
    modifiedAt: Date;
    checksum?: string;
  };
  /** Permission information */
  permissions?: {
    readable: boolean;
    writable: boolean;
    executable: boolean;
  };
  /** Additional context */
  context?: Record<string, any>;
}
```

### ConflictSuggestion
```typescript
interface ConflictSuggestion {
  /** Suggested strategy */
  strategy: ConflictResolution['strategy'];
  /** Suggested action */
  action: string;
  /** Resulting file path */
  resultPath: string;
  /** Confidence level (0-1) */
  confidence: number;
  /** Reason for suggestion */
  reason: string;
}
```

### PreviewResult
```typescript
interface PreviewResult {
  /** Preview session ID */
  previewId: string;
  /** Operations previewed */
  operations: FileOperation[];
  /** Potential conflicts */
  potentialConflicts: FileConflict[];
  /** Estimated execution time */
  estimatedTime: number;
  /** Disk space requirements */
  diskSpaceRequirements: {
    required: number;
    available: number;
    sufficient: boolean;
  };
  /** Risk assessment */
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    recommendations: string[];
  };
  /** Preview timestamp */
  timestamp: Date;
}
```

### OrganizationStatistics
```typescript
interface OrganizationStatistics {
  /** Total files processed */
  filesProcessed: number;
  /** Total bytes moved */
  bytesMoved: number;
  /** Average operation time */
  averageOperationTime: number;
  /** Conflicts resolved */
  conflictsResolved: number;
  /** Errors encountered */
  errorsEncountered: number;
  /** Directories created */
  directoriesCreated: number;
  /** Links updated (handled by LinkUpdater) */
  linksUpdated: number;
}
```

## Conflict Resolution Strategies

### Skip Strategy
- Skip the conflicting operation
- Leave files in their current locations
- Log the conflict for manual review

### Rename Strategy
- Rename the new file to avoid conflict
- Add suffix (1), (2), etc. or timestamp
- Update any links accordingly

### Subfolder Strategy
- Create a subfolder for conflicting files
- Use naming pattern like `conflicts/YYYY-MM-DD/`
- Preserve original file names

### Prompt Strategy
- Ask user to choose resolution
- Show conflict details and suggestions
- Allow custom resolution options

## Events

### OrganizerEvents
```typescript
interface OrganizerEvents {
  /** Emitted when organization starts */
  'organization-started': (sessionId: string) => void;

  /** Emitted when organization completes */
  'organization-completed': (result: OrganizeResult) => void;

  /** Emitted when organization fails */
  'organization-failed': (error: Error, sessionId: string) => void;

  /** Emitted during organization progress */
  'organization-progress': (progress: OrganizeProgress) => void;

  /** Emitted when operation completes */
  'operation-completed': (result: OperationResult) => void;

  /** Emitted when conflict is detected */
  'conflict-detected': (conflict: FileConflict) => void;

  /** Emitted when conflict is resolved */
  'conflict-resolved': (conflict: FileConflict, resolution: ConflictResolution) => void;

  /** Emitted when organization is cancelled */
  'organization-cancelled': (sessionId: string) => void;
}
```

## Implementation Requirements

### Safety Requirements
- Never overwrite existing files without explicit user consent
- Verify file permissions before operations
- Create backup copies before major operations (optional)
- Atomic file operations where possible

### Performance Requirements
- Move 1000 files in under 10 seconds
- Handle large files (>100MB) efficiently
- Progress updates at least every 10 operations
- Cancellation must respond within 500ms

### Error Recovery
- Automatic rollback for failed batch operations
- Detailed error logging with context
- Recovery from interrupted operations
- Validation of operation success

### File System Integration
- Respect Obsidian's file cache
- Trigger appropriate file system events
- Handle cross-platform path differences
- Work with network/synced folders

## Testing Requirements

### Unit Tests
- File movement operations
- Conflict detection and resolution
- Error handling scenarios
- Permission validation

### Integration Tests
- End-to-end organization workflows
- Large batch operations
- Cross-platform compatibility
- Integration with Obsidian API

### Test Scenarios
- Files with various permissions
- Network drive scenarios
- Very long file paths
- Special characters in names
- Concurrent file access

## Configuration

### Default Settings
```typescript
const defaultOrganizeSettings = {
  conflictResolution: 'prompt' as ConflictResolution['strategy'],
  batchSize: 50,
  continueOnError: false,
  showProgress: true,
  createParents: true,
  preserveTimestamps: true,
  timeout: 30000 // 30 seconds
};
```

### Environment Variables
- `TAGFOLDER_ORG_TIMEOUT`: Default operation timeout in milliseconds
- `TAGFOLDER_MAX_BATCH_SIZE`: Maximum batch size for operations
- `TAGFOLDER_BACKUP_ENABLED`: Enable backup prompts before major operations

## Security Considerations

### Path Validation
- Validate all target paths are within vault
- Prevent directory traversal attacks
- Sanitize file names and paths

### Permission Checks
- Verify write permissions before operations
- Respect read-only file attributes
- Handle permission denied gracefully

### Resource Management
- Monitor disk space before operations
- Limit concurrent file operations
- Handle out-of-space scenarios

## API Examples

### Basic Organization
```typescript
const organizer = new FileOrganizer(vault);

const operations = await generateOperations(files, tagMappings);
const result = await organizer.organizeFiles(operations, {
  conflictResolution: 'rename',
  showProgress: true,
  onProgress: (progress) => {
    console.log(`Progress: ${progress.completed}/${progress.total}`);
  }
});

console.log(`Successfully organized ${result.successfulOperations} files`);
```

### Conflict Resolution
```typescript
const conflicts = result.conflicts;
const resolution = await organizer.resolveConflicts(conflicts, 'rename');

console.log(`Resolved ${resolution.resolvedCount} conflicts`);
```

### Preview Operations
```typescript
const preview = await organizer.previewOperations(operations);

if (preview.riskAssessment.level === 'high') {
  console.warn('High risk operations detected:', preview.riskAssessment.factors);
  // Show preview to user for confirmation
}
```

### Rollback Operations
```typescript
const rollback = await organizer.rollbackOperations(result.results.map(r => r.operationId));

console.log(`Rolled back ${rollback.rolledBackCount} operations`);
```
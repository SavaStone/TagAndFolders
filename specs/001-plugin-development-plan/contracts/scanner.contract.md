# Scanner Module API Contract

## Overview
The Scanner module is responsible for discovering files and extracting their tags. It provides the foundation for all file organization operations.

## Public Interface

### IFileScanner

```typescript
interface IFileScanner {
  /**
   * Scan all files in the vault for tags
   * @param options Scan configuration options
   * @returns Promise resolving to scan results
   */
  scanVault(options?: ScanOptions): Promise<ScanResult>;

  /**
   * Scan a specific file for tags
   * @param filePath Path to the file to scan
   * @returns Promise resolving to file tag information
   */
  scanFile(filePath: string): Promise<FileTagInfo>;

  /**
   * Scan multiple files in batch
   * @param filePaths Array of file paths to scan
   * @param options Batch processing options
   * @returns Promise resolving to batch scan results
   */
  scanBatch(filePaths: string[], options?: BatchScanOptions): Promise<BatchScanResult>;

  /**
   * Get files that match specific tags
   * @param tags Array of tags to search for
   * @param options Search options
   * @returns Promise resolving to matching files
   */
  getFilesByTags(tags: string[], options?: SearchOptions): Promise<string[]>;

  /**
   * Check if scanner is currently running
   */
  get isScanning(): boolean;

  /**
   * Cancel current scan operation
   */
  cancelScan(): void;
}
```

## Data Types

### ScanOptions
```typescript
interface ScanOptions {
  /** Files and folders to exclude */
  exclusions?: string[];
  /** Only scan specific file types */
  fileTypes?: string[];
  /** Minimum file size to scan */
  minFileSize?: number;
  /** Maximum file size to scan */
  maxFileSize?: number;
  /** Include hidden files */
  includeHidden?: boolean;
  /** Scan only modified files since timestamp */
  modifiedSince?: Date;
  /** Progress callback */
  onProgress?: (progress: ScanProgress) => void;
}
```

### FileTagInfo
```typescript
interface FileTagInfo {
  /** File path */
  filePath: string;
  /** Tags found in file */
  tags: string[];
  /** Tag locations within file */
  tagLocations: TagLocation[];
  /** File metadata */
  metadata: FileMetadata;
  /** Scan timestamp */
  scannedAt: Date;
}
```

### TagLocation
```typescript
interface TagLocation {
  /** Tag text */
  tag: string;
  /** Line number */
  line: number;
  /** Column position */
  column: number;
  /** Context around tag */
  context: string;
  /** Tag type (frontmatter, inline, etc.) */
  type: 'frontmatter' | 'inline' | 'hashtag' | 'yaml';
}
```

### FileMetadata
```typescript
interface FileMetadata {
  /** File size in bytes */
  size: number;
  /** Creation timestamp */
  createdAt: Date;
  /** Last modified timestamp */
  modifiedAt: Date;
  /** File extension */
  extension: string;
  /** MIME type if available */
  mimeType?: string;
  /** Whether file is in Obsidian cache */
  cached: boolean;
}
```

### BatchScanOptions
```typescript
interface BatchScanOptions {
  /** Batch size for processing */
  batchSize?: number;
  /** Parallel processing limit */
  maxConcurrency?: number;
  /** Continue on error */
  continueOnError?: boolean;
  /** Progress callback */
  onProgress?: (progress: BatchProgress) => void;
}
```

### SearchOptions
```typescript
interface SearchOptions {
  /** Match all tags (AND) vs any tag (OR) */
  matchAll?: boolean;
  /** Case sensitive search */
  caseSensitive?: boolean;
  /** Include tag hierarchies (#parent/child matches #parent) */
  includeHierarchies?: boolean;
  /** Maximum results to return */
  limit?: number;
}
```

## Events

### ScannerEvents
```typescript
interface ScannerEvents {
  /** Emitted when scan starts */
  'scan-started': (scanId: string) => void;

  /** Emitted when scan completes */
  'scan-completed': (result: ScanResult) => void;

  /** Emitted when scan fails */
  'scan-failed': (error: Error, scanId: string) => void;

  /** Emitted during scan progress */
  'scan-progress': (progress: ScanProgress) => void;

  /** Emitted when file is scanned */
  'file-scanned': (fileInfo: FileTagInfo) => void;

  /** Emitted when scan is cancelled */
  'scan-cancelled': (scanId: string) => void;
}
```

## Implementation Requirements

### Performance Requirements
- Scan 1000 files in under 5 seconds
- Memory usage proportional to file count, not file size
- Cancellation must respond within 100ms
- Progress updates at least every 100 files

### Error Handling
- Graceful handling of unreadable files
- Continue scanning other files on individual failures
- Detailed error reporting with file paths and reasons
- Recovery from partial scan failures

### Tag Extraction Rules
1. **Frontmatter Tags**: Extract from YAML frontmatter `tags` field
2. **Inline Tags**: Detect `#tag` patterns in content
3. **WikiLink Tags**: Extract from `[[#tag]]` patterns
4. **Tag Hierarchies**: Support nested tags like `#project/active`
5. **Exclusion Patterns**: Ignore tags in code blocks and comments

### File Filtering
- Respect `.gitignore` patterns
- Support user-defined exclusion patterns
- Skip binary files by default
- Option to include/exclude hidden files

## Testing Requirements

### Unit Tests
- Tag extraction from various file formats
- Path filtering and exclusion logic
- Error handling for edge cases
- Performance benchmarks

### Integration Tests
- Full vault scanning scenarios
- Large file handling
- Concurrent scan operations
- Event emission accuracy

### Test Data
- Sample files with various tag formats
- Large vault simulations
- Edge case files (empty, corrupted, binary)
- Multi-language content samples

## Configuration

### Default Settings
```typescript
const defaultScanSettings = {
  exclusions: ['.git/', '.obsidian/', 'node_modules/'],
  fileTypes: ['.md', '.txt'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  includeHidden: false,
  batchSize: 100,
  maxConcurrency: 4
};
```

### Environment Variables
- `TAGFOLDER_SCAN_TIMEOUT`: Maximum scan duration in seconds
- `TAGFOLDER_MAX_MEMORY`: Maximum memory usage in MB
- `TAGFOLDER_DEBUG_SCAN`: Enable debug logging for scanning

## Security Considerations

### Path Validation
- Prevent directory traversal attacks
- Validate all file paths against vault root
- Sanitize user-provided exclusion patterns

### Resource Limits
- Enforce maximum file size limits
- Limit concurrent operations
- Monitor memory usage during scans

## API Examples

### Basic Vault Scan
```typescript
const scanner = new FileScanner(vault);

const result = await scanner.scanVault({
  exclusions: ['.git/', '.obsidian/'],
  onProgress: (progress) => {
    console.log(`Scanned ${progress.filesScanned} of ${progress.totalFiles}`);
  }
});

console.log(`Found ${result.filesWithTags} files with tags`);
```

### Targeted Tag Search
```typescript
const files = await scanner.getFilesByTags(['#project', '#active'], {
  matchAll: true,
  includeHierarchies: true
});

console.log(`Found ${files.length} files matching criteria`);
```

### Batch Processing
```typescript
const filePaths = await vault.getMarkdownFiles();
const batchResult = await scanner.scanBatch(filePaths.map(f => f.path), {
  batchSize: 50,
  maxConcurrency: 2,
  continueOnError: true
});

console.log(`Successfully scanned ${batchResult.successCount} files`);
console.log(`Failed to scan ${batchResult.errorCount} files`);
```
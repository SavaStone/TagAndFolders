/**
 * Scanner module types and interfaces
 */

/**
 * File Scanner interface
 */
export interface IFileScanner {
  /** Whether a scan is currently in progress */
  readonly isScanning: boolean

  /**
   * Cancel the current scan operation
   */
  cancelScan(): void

  /**
   * Scan the entire vault
   */
  scanVault(options?: ScanOptions): Promise<any>

  /**
   * Scan a single file
   */
  scanFile(filePath: string): Promise<FileTagInfo>

  /**
   * Scan multiple files in batch
   */
  scanBatch(filePaths: string[], options?: BatchScanOptions): Promise<BatchScanResult>

  /**
   * Get files by tags
   */
  getFilesByTags(tags: string[], options?: SearchOptions): Promise<string[]>
}

/**
 * Scan configuration options
 */
export interface ScanOptions {
  /** Files and folders to exclude from scan */
  exclusions?: string[]
  /** Only scan specific file types */
  fileTypes?: string[]
  /** Minimum file size to scan */
  minFileSize?: number
  /** Maximum file size to scan */
  maxFileSize?: number
  /** Include hidden files */
  includeHidden?: boolean
  /** Scan only files modified since timestamp */
  modifiedSince?: Date
  /** Progress callback */
  onProgress?: (progress: ScanProgress) => void
  /** Maximum depth for recursive scanning */
  maxDepth?: number
  /** Follow symbolic links */
  followSymlinks?: boolean
}

/**
 * File tag information
 */
export interface FileTagInfo {
  /** File path */
  filePath: string
  /** Tags found in file */
  tags: string[]
  /** Tag locations within file */
  tagLocations: TagLocation[]
  /** File metadata */
  metadata: FileMetadata
  /** Scan timestamp */
  scannedAt: Date
  /** Scan duration in milliseconds */
  scanDuration?: number
  /** Whether scan was successful */
  success: boolean
  /** Error if scan failed */
  error?: string
}

/**
 * Tag location information
 */
export interface TagLocation {
  /** Tag text */
  tag: string
  /** Line number (1-based) */
  line: number
  /** Column position (1-based) */
  column: number
  /** Context around tag */
  context: string
  /** Tag type */
  type: 'frontmatter' | 'inline' | 'hashtag' | 'yaml' | 'wiki-link'
  /** Tag length in characters */
  length: number
  /** Full line containing the tag */
  fullLine: string
  /** Confidence score for tag detection */
  confidence: number
}

/**
 * File metadata
 */
export interface FileMetadata {
  /** File size in bytes */
  size: number
  /** Creation timestamp */
  createdAt: Date
  /** Last modified timestamp */
  modifiedAt: Date
  /** File extension */
  extension: string
  /** MIME type if available */
  mimeType?: string
  /** Whether file is in Obsidian cache */
  cached: boolean
  /** File encoding */
  encoding?: string
  /** Whether file is binary */
  binary: boolean
}

/**
 * Batch scan options
 */
export interface BatchScanOptions {
  /** Batch size for processing */
  batchSize?: number
  /** Maximum parallel processing */
  maxConcurrency?: number
  /** Continue on error */
  continueOnError?: boolean
  /** Progress callback */
  onProgress?: (progress: BatchProgress) => void
  /** Timeout per file in milliseconds */
  timeoutPerFile?: number
  /** Skip files that timeout */
  skipTimeouts?: boolean
}

/**
 * Search options for tag-based file search
 */
export interface SearchOptions {
  /** Match all tags (AND) vs any tag (OR) */
  matchAll?: boolean
  /** Case sensitive search */
  caseSensitive?: boolean
  /** Include tag hierarchies */
  includeHierarchies?: boolean
  /** Maximum results to return */
  limit?: number
  /** Sort results */
  sortBy?: 'name' | 'modified' | 'created' | 'size'
  /** Sort direction */
  sortOrder?: 'asc' | 'desc'
  /** Include metadata in results */
  includeMetadata?: boolean
}

/**
 * Scan result
 */
export interface ScanResult {
  /** Unique scan identifier */
  scanId: string
  /** Total files scanned */
  filesScanned: number
  /** Files that contain tags */
  filesWithTags: number
  /** Total tags found */
  totalTags: number
  /** Unique tags found */
  uniqueTags: string[]
  /** Scan statistics */
  statistics: ScanStatistics
  /** Files that failed to scan */
  failedFiles: FailedFile[]
  /** Scan start timestamp */
  startedAt: Date
  /** Scan completion timestamp */
  completedAt?: Date
  /** Total scan duration in milliseconds */
  duration?: number
  /** Files with their tag information */
  files: FileTagInfo[]
}

/**
 * Batch scan result
 */
export interface BatchScanResult {
  /** Batch scan identifier */
  batchId: string
  /** Total files in batch */
  totalFiles: number
  /** Successfully scanned files */
  successCount: number
  /** Files that failed to scan */
  errorCount: number
  /** Files that were skipped */
  skippedCount: number
  /** Results for successfully scanned files */
  results: FileTagInfo[]
  /** Errors encountered */
  errors: ScanError[]
  /** Batch start timestamp */
  startedAt: Date
  /** Batch completion timestamp */
  completedAt?: Date
  /** Batch duration in milliseconds */
  duration?: number
}

/**
 * Scan progress information
 */
export interface ScanProgress {
  /** Number of files scanned */
  filesScanned: number
  /** Total files to scan */
  totalFiles: number
  /** Percentage complete */
  percentage: number
  /** Current file being scanned */
  currentFile?: string
  /** Tags found so far */
  tagsFound: number
  /** Files with tags found so far */
  filesWithTags: number
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number
  /** Scan start time */
  startedAt: Date
  /** Current timestamp */
  timestamp: Date
}

/**
 * Batch processing progress
 */
export interface BatchProgress {
  /** Total items in batch */
  totalItems: number
  /** Items completed */
  completedItems: number
  /** Items failed */
  failedItems: number
  /** Items skipped */
  skippedItems: number
  /** Percentage complete */
  percentage: number
  /** Current item being processed */
  currentItem?: string
  /** Estimated time remaining */
  estimatedTimeRemaining?: number
  /** Batch start time */
  startedAt: Date
  /** Current timestamp */
  timestamp: Date
}

/**
 * Scan statistics
 */
export interface ScanStatistics {
  /** Average tags per file */
  averageTagsPerFile: number
  /** File with most tags */
  fileWithMostTags: {
    path: string
    tagCount: number
  }
  /** Most common tag */
  mostCommonTag: {
    tag: string
    count: number
  }
  /** Tag frequency distribution */
  tagFrequency: Record<string, number>
  /** File type distribution */
  fileTypeDistribution: Record<string, number>
  /** Processing speed (files per second) */
  processingSpeed: number
  /** Total data processed in bytes */
  totalDataProcessed: number
}

/**
 * Failed file information
 */
export interface FailedFile {
  /** File path */
  path: string
  /** Error type */
  error: 'permission-denied' | 'file-not-found' | 'corrupted' | 'timeout' | 'other'
  /** Error message */
  message: string
  /** Error details */
  details?: any
  /** Timestamp when error occurred */
  timestamp: Date
}

/**
 * Scan error information
 */
export interface ScanError {
  /** Error identifier */
  id: string
  /** File path where error occurred */
  filePath: string
  /** Error type */
  type: 'parse-error' | 'io-error' | 'timeout' | 'memory-error' | 'other'
  /** Error message */
  message: string
  /** Error details */
  details?: any
  /** Stack trace if available */
  stack?: string
  /** Timestamp when error occurred */
  timestamp: Date
}
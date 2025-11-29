/**
 * Core entity types for the Tag and Folders plugin
 */

/**
 * Represents a mapping from a tag to a target path
 */
export interface TagPathMapping {
  /** Tag identifier (e.g., '#project') */
  tag: string
  /** Target directory path (e.g., 'Projects') */
  path: string
  /** Priority level for conflicts resolution (higher = more specific) */
  priority: number
  /** Whether this mapping is enabled */
  enabled: boolean
  /** When this mapping was created */
  createdAt: Date
  /** When this mapping was last modified */
  modifiedAt: Date
  /** Optional description of the mapping */
  description?: string
}

/**
 * Represents a file operation to be executed
 */
export interface FileOperation {
  /** Unique operation identifier */
  id: string
  /** Type of operation */
  type: 'move' | 'copy' | 'rename' | 'create-folder'
  /** Source file path */
  source: string
  /** Target file path */
  target: string
  /** Operation status */
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled'
  /** Timestamp when operation was created */
  createdAt: Date
  /** Timestamp when operation completed (if applicable) */
  completedAt?: Date
  /** Any error that occurred during operation */
  error?: string
  /** Associated tags that triggered this operation */
  associatedTags: string[]
  /** Whether this is part of a batch operation */
  batchId?: string
}

/**
 * Represents a wiki-link in Obsidian format
 */
export interface WikiLink {
  /** Link identifier */
  id: string
  /** The file being linked to */
  target: string
  /** Display alias if specified */
  alias?: string
  /** Heading within the target file */
  heading?: string
  /** Whether this is an embedded link (image, file, etc.) */
  embedded: boolean
  /** Link text as it appears in the source */
  rawText: string
  /** Link location in source file */
  location: {
    /** Line number (1-based) */
    line: number
    /** Column position (1-based) */
    column: number
    /** Length of the link in characters */
    length: number
  }
  /** Context around the link */
  context: {
    /** Text before the link */
    before: string
    /** Text after the link */
    after: string
    /** Full line containing the link */
    fullLine: string
  }
}

/**
 * Represents a conflict when trying to move/create a file
 */
export interface ConflictResolution {
  /** Type of conflict */
  type: 'target-exists' | 'target-read-only' | 'permission-denied' | 'path-too-long' | 'other'
  /** Resolution strategy */
  strategy: 'skip' | 'rename' | 'replace' | 'merge' | 'prompt'
  /** Conflict details */
  details: {
    /** Existing file information */
    existingFile?: {
      path: string
      size: number
      modifiedAt: Date
      checksum?: string
    }
    /** New file information */
    newFile?: {
      path: string
      size: number
      modifiedAt: Date
      checksum?: string
    }
    /** Permission information */
    permissions?: {
      readable: boolean
      writable: boolean
      executable: boolean
    }
    /** Additional context */
    context?: Record<string, any>
  }
  /** User's decision */
  userDecision?: 'skip' | 'rename' | 'replace' | 'cancel'
  /** Custom rename pattern if chosen */
  renamePattern?: string
  /** Timestamp when conflict was detected */
  detectedAt: Date
  /** Timestamp when conflict was resolved */
  resolvedAt?: Date
}

/**
 * Represents different types of links that can be updated
 */
export type LinkType =
  | 'wiki-link' // [[File Name]]
  | 'wiki-link-alias' // [[File Name|Alias]]
  | 'wiki-link-heading' // [[File Name#Heading]]
  | 'wiki-link-block' // ![[File Name]] (embeds)
  | 'markdown-link' // [Text](path)
  | 'markdown-reference' // [Text][reference]
  | 'attachment' // Direct file paths
  | 'relative-path' // ./relative/path

/**
 * Interface for a generic result from plugin operations
 */
export interface OperationResult {
  /** Unique result identifier */
  id: string
  /** Whether the operation was successful */
  success: boolean
  /** Result message */
  message?: string
  /** Error details if failed */
  error?: {
    type: string
    message: string
    details?: any
  }
  /** Timestamp when result was generated */
  timestamp: Date
  /** Additional metadata */
  metadata?: Record<string, any>
}

/**
 * Link Updater interface
 */
export interface ILinkUpdater {
  /**
   * Update links after file operations
   * @param fileOperations Completed file operations
   * @param options Update options
   * @returns Promise resolving to update results
   */
  updateLinks(fileOperations: FileOperation[], options?: UpdateOptions): Promise<UpdateResult>

  /**
   * Find all links to a specific file
   * @param filePath Path to the target file
   * @param options Search options
   * @returns Promise resolving to found links
   */
  findLinksToFile(filePath: string, options?: LinkSearchOptions): Promise<FoundLink[]>

  /**
   * Update links in a specific file
   * @param sourceFile Path to the file containing links
   * @param updates Array of link updates to apply
   * @param options Update options
   * @returns Promise resolving to update result
   */
  updateLinksInFile(sourceFile: string, updates: LinkUpdate[], options?: FileUpdateOptions): Promise<FileUpdateResult>

  /**
   * Validate links across the vault
   * @param options Validation options
   * @returns Promise resolving to validation results
   */
  validateLinks(options?: ValidationOptions): Promise<ValidationResult>

  /**
   * Generate link update preview
   * @param fileOperations File operations to preview updates for
   * @param options Preview options
   * @returns Promise resolving to preview results
   */
  previewUpdates(fileOperations: FileOperation[], options?: PreviewOptions): Promise<LinkUpdatePreview>

  /**
   * Check if link updates are currently running
   */
  get isUpdating(): boolean

  /**
   * Cancel current link update operation
   */
  cancelUpdates(): void
}


/**
 * Link search options
 */
export interface LinkSearchOptions {
  /** Search recursively in subdirectories */
  recursive?: boolean
  /** Include broken links */
  includeBroken?: boolean
  /** Include unresolved links */
  includeUnresolved?: boolean
  /** Maximum depth for recursive search */
  maxDepth?: number
  /** Files to exclude from search */
  excludeFiles?: string[]
}

/**
 * File update options
 */
export interface FileUpdateOptions {
  /** Whether to create backups */
  createBackup?: boolean
  /** Whether to validate after update */
  validateAfterUpdate?: boolean
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Recursive validation */
  recursive?: boolean
  /** Include broken links in results */
  includeBroken?: boolean
  /** Performance optimization settings */
  performance?: {
    maxFileSize?: number
    skipLargeFiles?: boolean
  }
}

/**
 * Preview options
 */
export interface PreviewOptions {
  /** Whether to include detailed analysis */
  detailed?: boolean
  /** Whether to estimate time required */
  estimateTime?: boolean
}

/**
 * Update progress information
 */
export interface UpdateProgress {
  /** Number of links processed */
  processed: number
  /** Total links to process */
  total: number
  /** Current file being processed */
  currentFile?: string
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Validation session ID */
  validationId: string
  /** Total files checked */
  filesChecked: number
  /** Total links found */
  totalLinks: number
  /** Valid links */
  validLinks: number
  /** Broken links */
  brokenLinks: BrokenLink[]
  /** Unresolved links */
  unresolvedLinks: UnresolvedLink[]
  /** Validation summary */
  summary: ValidationSummary
  /** Validation timestamp */
  validatedAt: Date
}

/**
 * Broken link information
 */
export interface BrokenLink {
  /** Link ID */
  id: string
  /** Source file */
  sourceFile: string
  /** Target file path */
  targetPath: string
  /** Link text */
  linkText?: string
  /** Link location */
  location: LinkLocation
  /** Error details */
  error: {
    type: 'file-not-found' | 'heading-not-found' | 'attachment-missing'
    message: string
  }
}

/**
 * Unresolved link information
 */
export interface UnresolvedLink {
  /** Link ID */
  id: string
  /** Source file */
  sourceFile: string
  /** Link text */
  linkText: string
  /** Link location */
  location: LinkLocation
  /** Reason link couldn't be resolved */
  reason: 'ambiguous-match' | 'multiple-matches' | 'circular-reference' | 'other'
}

/**
 * Validation summary
 */
export interface ValidationSummary {
  /** Total files */
  totalFiles: number
  /** Percentage of valid links */
  validPercentage: number
  /** Most common error type */
  mostCommonError: string
}

/**
 * Link update preview
 */
export interface LinkUpdatePreview {
  /** Preview session ID */
  previewId: string
  /** Total updates that would be made */
  totalUpdates: number
  /** Files that would be modified */
  filesToModify: string[]
  /** Estimated time required */
  estimatedTime?: number
  /** Risk assessment */
  riskAssessment: {
    level: 'low' | 'medium' | 'high'
    factors: string[]
    recommendations: string[]
  }
}

/**
 * Link location in source file
 */
export interface LinkLocation {
  /** Line number (1-based) */
  line: number
  /** Column position (1-based) */
  column: number
  /** Link length in characters */
  length: number
  /** Context around the link */
  context?: {
    /** Text before the link */
    before: string
    /** Text after the link */
    after: string
    /** Full line containing the link */
    fullLine: string
  }
}

/**
 * Link update result
 */
export interface UpdateResult {
  /** Update session ID */
  sessionId: string
  /** Total links found in files */
  totalLinksFound: number
  /** Number of links processed */
  linksProcessed: number
  /** Number of successfully updated links */
  linksUpdated: number
  /** Number of files modified */
  filesModified: number
  /** Number of failed updates */
  failedUpdates: number
  /** Files that couldn't be processed */
  unprocessableFiles: string[]
  /** Update statistics */
  statistics: {
    /** Updates by link type */
    updatesByType: Record<string, number>
    /** Processing time in milliseconds */
    processingTime: number
    /** Average links per file */
    averageLinksPerFile: number
    /** Largest file processed */
    largestFile?: string
    /** Most common link type */
    mostCommonLinkType?: string
  }
  /** When updates started */
  startedAt: Date
  /** When updates completed */
  completedAt: Date
}

/**
 * Link update options
 */
export interface UpdateOptions {
  /** Types of links to update */
  linkTypes?: LinkType[]
  /** Whether to create backups before updating */
  createBackup?: boolean
  /** Whether to validate links after updating */
  validateAfterUpdate?: boolean
  /** Whether to update embedded links */
  updateEmbedded?: boolean
  /** Whether to update aliases */
  updateAliases?: boolean
  /** Conflict resolution strategy */
  conflictResolution?: 'skip' | 'overwrite' | 'prompt'
  /** Dry run mode - don't actually make changes */
  dryRun?: boolean
  /** Maximum number of files to process */
  maxFiles?: number
  /** Specific files to process */
  includeFiles?: string[]
  /** Files to exclude */
  excludeFiles?: string[]
}

/**
 * Link update configuration for LinkUpdater
 */
export interface LinkUpdateConfig {
  /** Types of links to update */
  linkTypes: LinkType[]
  /** Whether to update embedded files */
  updateEmbeddedFiles: boolean
  /** Whether to update aliases */
  updateAliases: boolean
  /** Whether to normalize paths */
  normalizePaths: boolean
  /** Whether to preserve whitespace in links */
  preserveWhitespace: boolean
  /** Whether to create backups before updating */
  createBackups: boolean
  /** Conflict resolution strategy */
  conflictResolution?: 'skip' | 'overwrite' | 'prompt'
}

/**
 * File update result
 */
export interface FileUpdateResult {
  /** File path */
  file: string
  /** Number of links updated */
  updatedCount: number
  /** Number of links that failed to update */
  failedCount: number
  /** Whether update was successful */
  success: boolean
  /** Backup created if applicable */
  backupCreated?: boolean
}

/**
 * Found link information
 */
export interface FoundLink {
  /** Link ID */
  id: string
  /** Source file containing the link */
  sourceFile: string
  /** Target file path */
  targetFile: string
  /** Link text/alias */
  linkText?: string
  /** Link type */
  type: LinkType
  /** Link location in source file */
  location: LinkLocation
  /** Whether link is currently valid */
  isValid: boolean
  /** Link validation details */
  validation?: {
    valid: boolean
    validatedAt: Date
    error?: {
      type: string
      message: string
    }
  }
}

/**
 * Link update information
 */
export interface LinkUpdate {
  /** Update ID */
  id: string
  /** Original link text */
  originalText: string
  /** New link text */
  newText: string
  /** Link type */
  type: LinkType
  /** Original target path */
  originalTarget: string
  /** New target path */
  newTarget: string
  /** Link location */
  location: LinkLocation
  /** Update reason */
  reason: 'file-moved' | 'file-renamed' | 'path-normalization' | 'alias-update'
}
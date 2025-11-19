/**
 * Plugin configuration and settings types
 */

import type { TagPathMapping, ConflictResolution } from './entities.js'

/**
 * Main plugin settings interface
 */
export interface PluginSettings {
  /** Version of settings format */
  version: string
  /** General settings */
  general: GeneralSettings
  /** Scanner settings */
  scanner: ScannerSettings
  /** Organizer settings */
  organizer: OrganizerSettings
  /** Link updater settings */
  linkUpdater: LinkUpdaterSettings
  /** UI settings */
  ui: UISettings
  /** Advanced settings */
  advanced: AdvancedSettings
  /** Tag mappings */
  tagMappings: TagPathMapping[]
}

/**
 * General plugin settings
 */
export interface GeneralSettings {
  /** Default conflict resolution strategy */
  defaultConflictResolution: ConflictResolution['strategy']
  /** Enable notifications */
  enableNotifications: boolean
  /** Log level */
  logLevel: 'error' | 'warn' | 'info' | 'debug'
  /** Language for UI */
  language: 'en' | 'auto'
  /** Enable debug mode */
  debugMode: boolean
}

/**
 * Scanner configuration settings
 */
export interface ScannerSettings {
  /** Files and folders to exclude from scanning */
  exclusions: string[]
  /** File types to include in scanning */
  includeFileTypes: string[]
  /** File types to exclude from scanning */
  excludeFileTypes: string[]
  /** Minimum file size to scan (bytes) */
  minFileSize: number
  /** Maximum file size to scan (bytes) */
  maxFileSize: number
  /** Include hidden files in scanning */
  includeHidden: boolean
  /** Scan only modified files */
  scanModifiedOnly: boolean
  /** Tag extraction settings */
  tagExtraction: {
    /** Extract from YAML frontmatter */
    extractFromFrontmatter: boolean
    /** Extract from inline hashtags */
    extractFromInlineTags: boolean
    /** Extract from wiki-link tags */
    extractFromWikiLinks: boolean
    /** Extract from hashtags */
    extractFromHashtags: boolean
    /** Support tag hierarchies */
    supportTagHierarchies: boolean
    /** Tag prefix (default '#') */
    tagPrefix: string
  }
  /** Batch processing settings */
  batchSettings: {
    /** Enable batch processing */
    enabled: boolean
    /** Batch size */
    batchSize: number
    /** Maximum concurrent operations */
    maxConcurrency: number
  }
}

/**
 * File organization settings
 */
export interface OrganizerSettings {
  /** Default operation timeout in milliseconds */
  operationTimeout: number
  /** Create parent directories if they don't exist */
  createParentDirectories: boolean
  /** Preserve file timestamps when moving */
  preserveTimestamps: boolean
  /** Conflict resolution settings */
  conflictResolution: {
    /** Default strategy */
    defaultStrategy: ConflictResolution['strategy']
    /** Prompt user for conflicts */
    promptForConflicts: boolean
    /** Auto-resolve similar conflicts */
    autoResolveSimilar: boolean
    /** Naming pattern for conflicts */
    conflictNamingPattern: string
  }
  /** Safety settings */
  safety: {
    /** Enable backups before operations */
    enableBackups: boolean
    /** Backup location */
    backupLocation: string
    /** Backup retention period in days */
    backupRetentionDays: number
    /** Require confirmation for batch operations */
    requireConfirmationForBatch: boolean
    /** Maximum batch size */
    maxBatchSize: number
  }
  /** Performance settings */
  performance: {
    /** Maximum concurrent operations */
    maxConcurrentOperations: number
    /** Throttle interval between operations */
    throttleInterval: number
    /** Progress update interval */
    progressUpdateInterval: number
  }
}

/**
 * Link updater configuration settings
 */
export interface LinkUpdaterSettings {
  /** Types of links to update */
  linkTypes: import('./entities.js').LinkType[]
  /** Update settings */
  updateSettings: {
    /** Create backups before updating */
    createBackups: boolean
    /** Update embedded files */
    updateEmbeddedFiles: boolean
    /** Update aliases */
    updateAliases: boolean
    /** Normalize paths */
    normalizePaths: boolean
    /** Preserve whitespace */
    preserveWhitespace: boolean
  }
  /** Validation settings */
  validation: {
    /** Validate links after updating */
    validateAfterUpdate: boolean
    /** Report broken links */
    reportBrokenLinks: boolean
    /** Auto-fix broken links */
    autoFixBrokenLinks: boolean
    /** Check for circular references */
    checkForCircularReferences: boolean
  }
  /** Performance settings */
  performance: {
    /** Batch size for processing */
    batchSize: number
    /** Maximum file size to process */
    maxFileSize: number
    /** Skip large files */
    skipLargeFiles: boolean
  }
}

/**
 * User interface settings
 */
export interface UISettings {
  /** Display settings */
  display: {
    /** Show progress notifications */
    showProgressNotifications: boolean
    /** Show statistics in status bar */
    showStatisticsInStatus: boolean
    /** Show preview before execution */
    showPreviewBeforeExecution: boolean
    /** Enable compact mode */
    compactMode: boolean
  }
  /** Status bar settings */
  statusBar: {
    /** Show tag count */
    showTagCount: boolean
    /** Show operation count */
    showOperationCount: boolean
    /** Show last operation */
    showLastOperation: boolean
    /** Refresh interval */
    refreshInterval: number
  }
  /** Color scheme settings */
  colors: {
    /** Highlight conflicts */
    highlightConflicts: string
    /** Highlight success */
    highlightSuccess: string
    /** Highlight warnings */
    highlightWarning: string
    /** Highlight errors */
    highlightError: string
  }
  /** Keyboard shortcuts */
  shortcuts: {
    /** Action -> key binding mapping */
    [action: string]: string
  }
}

/**
 * Advanced plugin settings
 */
export interface AdvancedSettings {
  /** Debug settings */
  debug: {
    /** Enable debug logging */
    enableDebugLogging: boolean
    /** Log to file */
    logToFile: boolean
    /** Log file path */
    logFilePath: string
    /** Include stack traces */
    includeStackTrace: boolean
  }
  /** Performance monitoring */
  performance: {
    /** Enable profiling */
    enableProfiling: boolean
    /** Profile output path */
    profileOutputPath: string
    /** Memory monitoring */
    memoryMonitoring: boolean
    /** Operation timing */
    operationTiming: boolean
  }
  /** Experimental features */
  experimental: {
    /** Enable experimental features */
    enableExperimentalFeatures: boolean
    /** Feature flags */
    features: {
      [featureName: string]: boolean
    }
  }
  /** API settings */
  api: {
    /** Enable external API */
    enableExternalAPI: boolean
    /** Allowed origins */
    allowedOrigins: string[]
    /** Rate limiting */
    rateLimiting: {
      /** Enable rate limiting */
      enabled: boolean
      /** Maximum requests */
      maxRequests: number
      /** Time window in milliseconds */
      windowMs: number
    }
  }
}
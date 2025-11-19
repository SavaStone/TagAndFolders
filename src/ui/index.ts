/**
 * UI components and types index
 * Re-exports all UI interfaces and types for organized imports
 */

// Progress indicator types
export type {
  ProgressOptions,
  ProgressState,
  ProgressType
} from './progress.js'

// File preview types
export type {
  FilePreviewOptions,
  FilePreviewData
} from './file-preview.js'

// Dialog types (these will need to be created or extracted from existing dialog files)
export interface TagSelectionDialogOptions {
  /** Available tag mappings */
  tagMappings: PathMappingResult[]
  /** Path of the current note */
  currentNotePath: string
  /** Default tag to select */
  defaultTag?: string
  /** Allow multiple selection */
  multiple?: boolean
  /** Show tag descriptions */
  showDescriptions?: boolean
}

export interface DialogResult<T> {
  /** Whether dialog was confirmed */
  confirmed: boolean
  /** Selected data */
  data?: T
  /** Action taken */
  action?: 'confirm' | 'cancel' | 'skip' | 'custom'
  /** Custom action data */
  customData?: any
}

export interface ConflictResolutionDialogOptions {
  /** Conflict details */
  conflict: {
    type: string
    sourceFile: string
    targetFile: string
    existingFile?: string
    description: string
  }
  /** Available resolution strategies */
  strategies: ConflictResolutionResult[]
  /** Default strategy */
  defaultStrategy?: string
  /** Show preview */
  showPreview?: boolean
}

export interface ConflictResolutionResult {
  /** Resolution strategy */
  strategy: 'skip' | 'rename' | 'replace' | 'merge' | 'prompt'
  /** New filename if renaming */
  newFilename?: string
  /** Create backup flag */
  createBackup?: boolean
  /** Additional options */
  options?: Record<string, any>
}

export interface OrganizationPreviewOptions {
  /** Session ID */
  sessionId: string
  /** File operations to preview */
  operations: FileOperation[]
  /** Show detailed paths */
  showDetails?: boolean
  /** Allow editing */
  allowEdit?: boolean
}

export interface OrganizationSessionResult {
  /** Session ID */
  sessionId: string
  /** Total operations */
  totalOperations: number
  /** Completed operations */
  completedOperations: number
  /** Failed operations */
  failedOperations: number
  /** Duration in milliseconds */
  duration: number
  /** Files moved */
  filesMoved: number
  /** Links updated */
  linksUpdated: number
  /** Conflicts encountered */
  conflicts: number
  /** Result summary */
  summary: {
    success: boolean
    message: string
    warnings?: string[]
    errors?: string[]
  }
}

// Re-export types that need to be imported from other modules
import type { PathMappingResult, FileOperation } from '../types/entities.js'

// Then re-export them for consistency
export type { PathMappingResult, FileOperation }
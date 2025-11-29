/**
 * Utility types and functions index
 * Re-exports all utility types for organized imports
 */

// Path utility types
export type {
  PathValidationOptions,
  ValidationError,
  ValidationWarning
} from './validation.js'

// Link types
export type {
  LinkType,
  LinkSearchOptions,
  FileUpdateOptions,
  ValidationOptions,
  PreviewOptions
} from '@/types/entities.js'

// Event middleware type
export type {
  EventMiddleware
} from './events.js'

// Error types
export type {
  TagAndFoldersError,
  ScannerError,
  FileOperationError,
  FileConflictError,
  ValidationError as UtilValidationError
} from './errors.js'
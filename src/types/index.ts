/**
 * Type index file for TagFolder plugin
 * Centralized export of all types for easier importing
 */

// Core entity types
export type {
  TagPathMapping,
  FileOperation,
  WikiLink,
  ConflictResolution,
  UpdateProgress,
  ValidationResult,
  BrokenLink,
  UnresolvedLink,
  ValidationSummary,
  LinkUpdatePreview,
  LinkLocation,
  FileUpdateResult,
  FoundLink,
  LinkUpdate,
  UpdateResult,
  UpdateOptions
} from './entities.js'

// Scanner types
export type {
  ScanProgress,
  ScanOptions as ScannerOptions
} from './scanner.js'

// Path mapper types
export type {
  PathMappingResult
} from '../scanning/path-mapper.js'

// Error types
export type {
  TagFolderError,
  ScannerError,
  FileOperationError,
  FileConflictError,
  ValidationError
} from '../utils/errors.js'

// Contract types
export type {
  ITagScanner,
  ILinkUpdater
} from './contracts/index.js'

// UI types
export type {
  ProgressOptions,
  ProgressState,
  ProgressType,
  FilePreviewOptions,
  FilePreviewData,
  TagSelectionDialogOptions,
  DialogResult,
  ConflictResolutionDialogOptions,
  ConflictResolutionResult,
  OrganizationPreviewOptions,
  OrganizationSessionResult
} from '../ui/index.js'

// Utility types
export type {
  PathValidationOptions,
  ValidationWarning,
  LinkType,
  LinkSearchOptions,
  FileUpdateOptions,
  ValidationOptions,
  PreviewOptions
} from '../utils/index.js'
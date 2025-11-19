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
  PathMappingResult,
  TagMatch,
  ScanProgress,
  ScannerOptions,
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

// Error types
export type {
  TagFolderError,
  ScannerError,
  FileOperationError,
  LinkUpdateError,
  ConflictError,
  ValidationError
} from '../utils/errors.js'

// Contract types
export type {
  ITagScanner,
  IPathMapper,
  IFileMover,
  ILinkUpdater,
  IConflictResolver,
  IManualOrganizer
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
  ValidationError,
  ValidationWarning,
  LinkType,
  LinkSearchOptions,
  FileUpdateOptions,
  ValidationOptions,
  PreviewOptions
} from '../utils/index.js'
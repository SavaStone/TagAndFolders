/**
 * Contract interfaces index
 * Re-exports all contract interfaces for organized imports
 */

// Import from existing type definitions
export type {
  IFileScanner as ITagScanner,
  ScanOptions as ScannerOptions,
  ScanProgress
} from '../scanner.js'

export type {
  PathMappingResult
} from '../../scanning/path-mapper.js'

export type {
  FileOperation,
  ConflictResolution
} from '../entities.js'

export type {
  ILinkUpdater,
  UpdateOptions,
  UpdateResult,
  LinkSearchOptions,
  FileUpdateOptions,
  ValidationOptions,
  PreviewOptions,
  UpdateProgress,
  ValidationResult,
  BrokenLink,
  UnresolvedLink,
  ValidationSummary,
  LinkUpdatePreview,
  LinkLocation,
  FileUpdateResult,
  FoundLink,
  LinkUpdate
} from './link-updater.contract.js'

// TODO: Define missing interfaces when implemented
// export interface IFileMover { }
// export interface IConflictResolver { }
// export interface IManualOrganizer { }
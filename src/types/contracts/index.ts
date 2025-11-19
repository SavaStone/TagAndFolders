/**
 * Contract interfaces index
 * Re-exports all contract interfaces for organized imports
 */

export type {
  ITagScanner,
  ScannerOptions,
  ScanProgress
} from './tag-scanner.contract.js'

export type {
  IPathMapper,
  PathMappingResult,
  TagMatch
} from './path-mapper.contract.js'

export type {
  IFileMover,
  FileOperation,
  ConflictResolution
} from './file-mover.contract.js'

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

export type {
  IConflictResolver
} from './conflict-resolver.contract.js'

export type {
  IManualOrganizer
} from './manual-organizer.contract.js'
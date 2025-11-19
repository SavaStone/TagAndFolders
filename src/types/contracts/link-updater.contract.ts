/**
 * Link Updater Module API Contract
 *
 * Re-exports the core Link Updater interfaces from entities.ts for organized imports.
 */

export {
  type ILinkUpdater,
  type UpdateOptions,
  type UpdateResult,
  type LinkSearchOptions,
  type FileUpdateOptions,
  type ValidationOptions,
  type PreviewOptions,
  type UpdateProgress,
  type ValidationResult,
  type BrokenLink,
  type UnresolvedLink,
  type ValidationSummary,
  type LinkUpdatePreview,
  type LinkLocation,
  type FileUpdateResult,
  type FoundLink,
  type LinkUpdate
} from '../entities.js'
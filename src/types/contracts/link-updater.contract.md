# Link Updater Module API Contract

This file contains the contract interfaces for the Link Updater module. The main implementation interfaces are in src/types/entities.ts.

## Re-export of Core Interfaces

This file re-exports the core Link Updater interfaces from entities.ts for ease of import and organization.

```typescript
// Re-export core interfaces from entities.ts
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
```

## Usage

```typescript
import type {
  ILinkUpdater,
  UpdateOptions,
  UpdateResult
} from '@/types/contracts/link-updater.contract.js'

const linkUpdater: ILinkUpdater = new LinkUpdater(config)

const result = await linkUpdater.updateLinks(operations, options)
```
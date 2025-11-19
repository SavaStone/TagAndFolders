# Configuration Module API Contract

## Overview
The Configuration module manages plugin settings, tag-to-path mappings, and user preferences. It provides the interface for configuring all aspects of the TagFolder plugin.

## Public Interface

### IConfigurationManager

```typescript
interface IConfigurationManager {
  /**
   * Load plugin configuration
   * @returns Promise resolving to current settings
   */
  loadSettings(): Promise<PluginSettings>;

  /**
   * Save plugin configuration
   * @param settings Settings to save
   * @returns Promise resolving when saved
   */
  saveSettings(settings: PluginSettings): Promise<void>;

  /**
   * Get current tag-to-path mappings
   * @returns Array of tag mappings
   */
  getTagMappings(): TagPathMapping[];

  /**
   * Add or update a tag mapping
   * @param mapping Tag mapping to add/update
   * @returns Promise resolving when updated
   */
  updateTagMapping(mapping: TagPathMapping): Promise<void>;

  /**
   * Remove a tag mapping
   * @param tag Tag to remove mapping for
   * @returns Promise resolving when removed
   */
  removeTagMapping(tag: string): Promise<void>;

  /**
   * Get default configuration
   * @returns Default plugin settings
   */
  getDefaultSettings(): PluginSettings;

  /**
   * Reset settings to defaults
   * @returns Promise resolving when reset
   */
  resetToDefaults(): Promise<void>;

  /**
   * Export configuration to file
   * @param filePath Path to export configuration
   * @param options Export options
   * @returns Promise resolving when exported
   */
  exportConfiguration(filePath: string, options?: ExportOptions): Promise<void>;

  /**
   * Import configuration from file
   * @param filePath Path to import configuration from
   * @param options Import options
   * @returns Promise resolving to import results
   */
  importConfiguration(filePath: string, options?: ImportOptions): Promise<ImportResult>;

  /**
   * Validate configuration
   * @param settings Settings to validate
   * @returns Validation result
   */
  validateSettings(settings: PluginSettings): ValidationResult;

  /**
   * Get configuration schema
   * @returns JSON schema for configuration
   */
  getConfigurationSchema(): JSONSchema;

  /**
   * Migrate configuration from older version
   * @param oldVersion Version to migrate from
   * @param oldSettings Old configuration
   * @returns Migrated configuration
   */
  migrateConfiguration(oldVersion: string, oldSettings: any): Promise<PluginSettings>;
}
```

## Data Types

### PluginSettings (Extended)
```typescript
interface PluginSettings extends BasePluginSettings {
  /** General settings */
  general: GeneralSettings;

  /** Scanner settings */
  scanner: ScannerSettings;

  /** Organizer settings */
  organizer: OrganizerSettings;

  /** Link updater settings */
  linkUpdater: LinkUpdaterSettings;

  /** UI settings */
  ui: UISettings;

  /** Advanced settings */
  advanced: AdvancedSettings;

  /** Tag mappings */
  tagMappings: TagPathMapping[];
}
```

### GeneralSettings
```typescript
interface GeneralSettings {
  /** Default conflict resolution */
  defaultConflictResolution: ConflictResolution['strategy'];

  /** Enable notifications */
  enableNotifications: boolean;

  /** Log level */
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}
```

### ScannerSettings
```typescript
interface ScannerSettings {
  /** Files and folders to exclude */
  exclusions: string[];

  /** File types to include */
  includeFileTypes: string[];

  /** File types to exclude */
  excludeFileTypes: string[];

  /** Minimum file size to scan */
  minFileSize: number;

  /** Maximum file size to scan */
  maxFileSize: number;

  /** Include hidden files */
  includeHidden: boolean;

  /** Scan only modified files */
  scanModifiedOnly: boolean;

  /** Tag extraction settings */
  tagExtraction: {
    extractFromFrontmatter: boolean;
    extractFromInlineTags: boolean;
    extractFromWikiLinks: boolean;
    extractFromHashtags: boolean;
    supportTagHierarchies: boolean;
    tagPrefix: string; // Default '#'
  };

  /** Batch processing settings */
  batchSettings: {
    enabled: boolean;
    batchSize: number;
    maxConcurrency: number;
  };
}
```

### OrganizerSettings
```typescript
interface OrganizerSettings {
  /** Default operation timeout */
  operationTimeout: number;

  /** Create parent directories */
  createParentDirectories: boolean;

  /** Preserve file timestamps */
  preserveTimestamps: boolean;

  /** Conflict resolution settings */
  conflictResolution: {
    defaultStrategy: ConflictResolution['strategy'];
    promptForConflicts: boolean;
    autoResolveSimilar: boolean;
    conflictNamingPattern: string; // e.g., '{name} ({conflict})'
  };

  /** Safety settings */
  safety: {
    enableBackups: boolean;
    backupLocation: string;
    backupRetentionDays: number;
    requireConfirmationForBatch: boolean;
    maxBatchSize: number;
  };

  /** Performance settings */
  performance: {
    maxConcurrentOperations: number;
    throttleInterval: number;
    progressUpdateInterval: number;
  };
}
```

### LinkUpdaterSettings
```typescript
interface LinkUpdaterSettings {
  /** Link types to update */
  linkTypes: LinkType[];

  /** Update settings */
  updateSettings: {
    createBackups: boolean;
    updateEmbeddedFiles: boolean;
    updateAliases: boolean;
    normalizePaths: boolean;
    preserveWhitespace: boolean;
  };

  /** Validation settings */
  validation: {
    validateAfterUpdate: boolean;
    reportBrokenLinks: boolean;
    autoFixBrokenLinks: boolean;
    checkForCircularReferences: boolean;
  };

  /** Performance settings */
  performance: {
    batchSize: number;
    maxFileSize: number;
    skipLargeFiles: boolean;
  };
}
```

### UISettings
```typescript
interface UISettings {
  /** Display settings */
  display: {
    showProgressNotifications: boolean;
    showStatisticsInStatus: boolean;
    showPreviewBeforeExecution: boolean;
    compactMode: boolean;
  };

  /** Status bar settings */
  statusBar: {
    showTagCount: boolean;
    showOperationCount: boolean;
    showLastOperation: boolean;
    refreshInterval: number;
  };

  /** Color scheme */
  colors: {
    highlightConflicts: string;
    highlightSuccess: string;
    highlightWarning: string;
    highlightError: string;
  };

  /** Keyboard shortcuts */
  shortcuts: {
    [action: string]: string; // Key binding
  };
}
```

### AdvancedSettings
```typescript
interface AdvancedSettings {
  /** Debug settings */
  debug: {
    enableDebugLogging: boolean;
    logToFile: boolean;
    logFilePath: string;
    includeStackTrace: boolean;
  };

  /** Performance monitoring */
  performance: {
    enableProfiling: boolean;
    profileOutputPath: string;
    memoryMonitoring: boolean;
    operationTiming: boolean;
  };

  /** Experimental features */
  experimental: {
    enableExperimentalFeatures: boolean;
    features: {
      [featureName: string]: boolean;
    };
  };

  /** API settings */
  api: {
    enableExternalAPI: boolean;
    allowedOrigins: string[];
    rateLimiting: {
      enabled: boolean;
      maxRequests: number;
      windowMs: number;
    };
  };
}
```

### ExportOptions
```typescript
interface ExportOptions {
  /** Include tag mappings */
  includeTagMappings: boolean;

  /** Include settings */
  includeSettings: boolean;

  /** Include statistics */
  includeStatistics: boolean;

  /** Export format */
  format: 'json' | 'yaml' | 'toml';

  /** Compress export */
  compress: boolean;

  /** Exclude sensitive data */
  excludeSensitive: boolean;
}
```

### ImportOptions
```typescript
interface ImportOptions {
  /** Merge with existing settings */
  merge: boolean;

  /** Overwrite existing mappings */
  overwriteMappings: boolean;

  /** Validate before import */
  validate: boolean;

  /** Create backup before import */
  createBackup: boolean;

  /** Import only specific sections */
  sections?: {
    settings?: boolean;
    tagMappings?: boolean;
    statistics?: boolean;
  };
}
```

### ImportResult
```typescript
interface ImportResult {
  /** Import success status */
  success: boolean;

  /** Items imported */
  itemsImported: {
    settings: number;
    tagMappings: number;
  };

  /** Items skipped */
  itemsSkipped: {
    settings: number;
    tagMappings: number;
  };

  /** Validation errors */
  validationErrors: ValidationError[];

  /** Import warnings */
  warnings: string[];

  /** Backup location if created */
  backupLocation?: string;

  /** Import timestamp */
  importedAt: Date;
}
```

### ValidationError
```typescript
interface ValidationError {
  /** Error type */
  type: 'schema' | 'validation' | 'conflict' | 'permission';

  /** Error message */
  message: string;

  /** Path to error in configuration */
  path?: string;

  /** Invalid value */
  value?: any;

  /** Expected value/type */
  expected?: any;
}
```

## Configuration Schema

### JSON Schema Structure
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "TagFolder Plugin Configuration",
  "description": "Configuration schema for TagFolder Obsidian plugin",
  "type": "object",
  "properties": {
    "general": { "$ref": "#/definitions/GeneralSettings" },
    "scanner": { "$ref": "#/definitions/ScannerSettings" },
    "organizer": { "$ref": "#/definitions/OrganizerSettings" },
    "linkUpdater": { "$ref": "#/definitions/LinkUpdaterSettings" },
    "ui": { "$ref": "#/definitions/UISettings" },
    "advanced": { "$ref": "#/definitions/AdvancedSettings" },
    "tagMappings": {
      "type": "array",
      "items": { "$ref": "#/definitions/TagPathMapping" }
    }
  },
  "required": ["general", "tagMappings"],
  "additionalProperties": false,
  "definitions": {
    // Detailed schema definitions for each settings type
  }
}
```

## Configuration Migration

### Version History
- **1.0.0**: Initial configuration format
- **1.1.0**: Added advanced settings section
- **1.2.0**: Added keyboard shortcuts support
- **1.3.0**: Added experimental features support

### Migration Rules
```typescript
interface MigrationRule {
  /** Source version */
  fromVersion: string;

  /** Target version */
  toVersion: string;

  /** Migration function */
  migrate: (oldSettings: any) => Promise<PluginSettings>;

  /** Whether migration is reversible */
  reversible: boolean;
}
```

## Events

### ConfigurationEvents
```typescript
interface ConfigurationEvents {
  /** Emitted when settings are loaded */
  'settings-loaded': (settings: PluginSettings) => void;

  /** Emitted when settings are saved */
  'settings-saved': (settings: PluginSettings) => void;

  /** Emitted when tag mapping is added/updated */
  'tag-mapping-updated': (mapping: TagPathMapping) => void;

  /** Emitted when tag mapping is removed */
  'tag-mapping-removed': (tag: string) => void;

  /** Emitted when configuration is validated */
  'settings-validated': (result: ValidationResult) => void;

  /** Emitted when configuration is reset */
  'settings-reset': () => void;
}
```

## Implementation Requirements

### Persistence Requirements
- Store settings using Obsidian's data API
- Maintain configuration compatibility across versions
- Provide manual backup prompts before major changes
- Support configuration sharing between vaults

### Validation Requirements
- Validate all settings against JSON schema
- Check file path validity and permissions
- Validate tag format and path syntax
- Prevent conflicting configuration values

### Performance Requirements
- Load settings within 100ms
- Save settings within 50ms
- Validate settings within 200ms
- Handle large configuration files efficiently

### Security Requirements
- Sanitize all user inputs
- Validate file paths to prevent directory traversal
- Encrypt sensitive configuration data
- Respect user privacy preferences

## Testing Requirements

### Unit Tests
- Configuration loading and saving
- Tag mapping management
- Settings validation
- Migration between versions

### Integration Tests
- Integration with Obsidian's data API
- Configuration import/export functionality
- End-to-end configuration workflows
- Error handling scenarios

### Test Scenarios
- Corrupted configuration files
- Invalid settings values
- Version compatibility issues
- Permission-related errors

## Configuration Examples

### Minimal Configuration
```json
{
  "general": {
    "autoOrganize": true,
    "realTimeMonitoring": false
  },
  "tagMappings": [
    {
      "tag": "#project",
      "path": "Projects",
      "priority": 1,
      "enabled": true
    }
  ]
}
```

### Advanced Configuration
```json
{
  "general": {
    "defaultConflictResolution": "rename",
    "enableNotifications": true,
    "logLevel": "info"
  },
  "scanner": {
    "exclusions": [".git/", ".obsidian/"],
    "tagExtraction": {
      "extractFromFrontmatter": true,
      "extractFromInlineTags": true,
      "supportTagHierarchies": true
    }
  },
  "organizer": {
    "conflictResolution": {
      "defaultStrategy": "prompt",
      "autoResolveSimilar": false
    },
    "safety": {
      "enableBackups": true,
      "requireConfirmationForBatch": true
    }
  },
  "tagMappings": [
    {
      "tag": "#project/active",
      "path": "Projects/Active",
      "priority": 10,
      "enabled": true
    },
    {
      "tag": "#project/archived",
      "path": "Projects/Archived",
      "priority": 5,
      "enabled": true
    }
  ]
}
```

## API Examples

### Load and Update Settings
```typescript
const config = new ConfigurationManager(vault);

// Load current settings
const settings = await config.loadSettings();

// Update a tag mapping
await config.updateTagMapping({
  tag: '#meeting',
  path: 'Meetings',
  priority: 1,
  enabled: true,
  createdAt: new Date(),
  modifiedAt: new Date()
});

// Save updated settings
await config.saveSettings(settings);
```

### Import/Export Configuration
```typescript
// Export configuration
await config.exportConfiguration('/path/to/tagfolder-config.json', {
  includeTagMappings: true,
  includeSettings: true,
  format: 'json'
});

// Import configuration
const result = await config.importConfiguration('/path/to/config.json', {
  merge: true,
  validate: true,
  createBackup: true
});

console.log(`Imported ${result.itemsImported.tagMappings} tag mappings`);
```

### Validate Settings
```typescript
const validation = await config.validateSettings(settings);

if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
  // Show errors to user
}
```
/**
 * Tag Selection Dialog - Allows users to select tags for organization
 * Based on reference design using SuggestModal
 */

import { App, SuggestModal } from 'obsidian'
import type { PathMappingResult } from '@/scanning/path-mapper.js'
import { eventEmitter } from '@/utils/events.js'
import { tagToDirectoryPath, tagToDisplayPath } from '@/utils/path-utils.js'

/**
 * Tag selection result
 */
export interface TagSelectionResult {
  /** Selected tag */
  selectedTag: string
  /** Target path for the selected tag */
  targetPath: string
  /** Whether user wants to create folder if it doesn't exist */
  createFolder: boolean
  /** Whether to update links after moving */
  updateLinks: boolean
  /** Whether to create backup before operation */
  createBackup: boolean
}

/**
 * Tag selection dialog options
 */
export interface TagSelectionDialogOptions {
  /** Available tags with their paths */
  tagMappings: PathMappingResult[]
  /** Currently active note path */
  currentNotePath?: string
  /** Default tag to pre-select */
  defaultTag?: string
  /** Show advanced options */
  showAdvanced?: boolean
  /** Custom title */
  title?: string
}

/**
 * Tag Selection Dialog using SuggestModal design from reference
 */
export class TagSelectionDialog extends SuggestModal<PathMappingResult> {
  private tagMappings: PathMappingResult[]
  private currentNotePath: string | undefined
  private dialogOptions: TagSelectionDialogOptions
  private onResolve: (result: TagSelectionResult) => void

  constructor(app: App, options: TagSelectionDialogOptions) {
    super(app)

    this.tagMappings = options.tagMappings
    this.currentNotePath = options.currentNotePath
    this.dialogOptions = options

    // Set modal title
    this.setTitle(options.title || 'Select Tag for Organization')

    // Add CSS class for styling - matches reference design
    this.modalEl.addClass('tag-selection-modal')

    // Create promise for result
    this.onResolve = () => {}
  }

  // Returns suggestions for SuggestModal
  getSuggestions(query: string): PathMappingResult[] {
    if (this.tagMappings.length === 0) {
      return []
    }

    // Filter suggestions based on query
    const filtered = this.tagMappings.filter(mapping =>
      mapping.tag.toLowerCase().includes(query.toLowerCase())
    )

    // Sort by hierarchy (more nested tags first) like reference
    return filtered.sort((a, b) => {
      const aNesting = (a.tag.match(/\//g) || []).length
      const bNesting = (b.tag.match(/\//g) || []).length
      return bNesting - aNesting
    })
  }

  // Renders each suggestion item - EXACTLY like reference design
  renderSuggestion(mapping: PathMappingResult, el: HTMLElement) {
    // Main container with flex layout like reference
    const suggestionItem = el.createDiv('suggestion-item')
    suggestionItem.style.display = 'flex'
    suggestionItem.style.alignItems = 'center'
    suggestionItem.style.padding = '8px 12px'
    suggestionItem.style.cursor = 'pointer'
    suggestionItem.style.borderRadius = '4px'
    suggestionItem.style.margin = '2px 0'
    // FIX: User select on entire element, not children
    suggestionItem.style.userSelect = 'none'
    // FIX: Prevent Obsidian's default hover behavior
    suggestionItem.style.backgroundColor = 'transparent'
    suggestionItem.style.transition = 'background-color 0.15s ease'

    // Store mapping reference for click handling
    ;(suggestionItem as any)._tagMapping = mapping

    // Add custom hover effect
    suggestionItem.addEventListener('mouseenter', () => {
      suggestionItem.style.backgroundColor = 'var(--background-modifier-hover)'
    })

    suggestionItem.addEventListener('mouseleave', () => {
      suggestionItem.style.backgroundColor = 'transparent'
    })

    // Add click event listener to the entire container
    suggestionItem.addEventListener('click', (evt: MouseEvent) => {
      // Only handle direct clicks, not bubbling from children
      if (evt.currentTarget === evt.target || (evt.currentTarget as HTMLElement).contains(evt.target as HTMLElement)) {
        const mapping = (evt.currentTarget as any)._tagMapping
        if (mapping) {
          evt.preventDefault()
          evt.stopPropagation()
          this.onChooseSuggestion(mapping, evt)
        }
      }
    })

    // Content wrapper to isolate hover effects
    const contentWrapper = suggestionItem.createDiv()
    contentWrapper.style.display = 'flex'
    contentWrapper.style.alignItems = 'center'
    contentWrapper.style.width = '100%'
    contentWrapper.style.pointerEvents = 'none' // Let parent handle all interactions

    // Tag icon (hash symbol) exactly like reference
    const tagIcon = contentWrapper.createSpan('tag-icon')
    tagIcon.textContent = '#'
    tagIcon.style.color = 'var(--text-accent)'
    tagIcon.style.fontWeight = 'bold'
    tagIcon.style.marginRight = '8px'
    tagIcon.style.fontSize = '14px'

    // Tag name without # prefix but keep icon separate
    const tagName = contentWrapper.createSpan('tag-text')
    tagName.textContent = tagToDisplayPath(mapping.tag) // Remove # and preserve slashes
    tagName.style.fontWeight = '500'
    tagName.style.color = 'var(--text-normal)'
    tagName.style.marginRight = '8px'
    tagName.style.flex = '1'

    // Path preview - show with arrow and folder icon using display path
    const pathPreview = contentWrapper.createSpan('tag-preview')
    // Use tagToDisplayPath for the path to preserve slashes
    const displayPath = tagToDisplayPath(mapping.tag)
    const formattedPath = `→ 📁 ${displayPath}/`
    pathPreview.textContent = formattedPath
    pathPreview.style.fontSize = '12px'
    pathPreview.style.color = 'var(--text-muted)'
    pathPreview.style.fontFamily = 'monospace'
    pathPreview.style.opacity = '0.8'
  }

  // Called when suggestion is selected
  onChooseSuggestion(mapping: PathMappingResult, evt: MouseEvent | KeyboardEvent) {
    this.resolveSelection(mapping)
  }

  // Override onOpen to add custom content exactly like reference
  override onOpen() {
    super.onOpen()

    // Add custom content
    if (this.currentNotePath) {
      this.addFileInfo()
    }

    // Set empty state if no tags
    if (this.tagMappings.length === 0) {
      this.setEmptyState()
    } else {
      // Add instructions exactly like reference
      this.addInstructions()
    }

    // Add reference CSS styles
    this.addReferenceStyles()
  }

  // Add file information at the top - matches reference design
  private addFileInfo(): void {
    const infoEl = this.contentEl.createDiv('tag-selection-info')
    infoEl.style.padding = '12px 16px'
    infoEl.style.backgroundColor = 'var(--background-secondary)'
    infoEl.style.borderBottom = '1px solid var(--background-modifier-border)'
    infoEl.style.position = 'relative'
    infoEl.style.paddingLeft = '20px'

    const fileName = this.currentNotePath?.split('/').pop() || 'Current Note'

    // File icon and name
    const fileHeader = infoEl.createDiv()
    fileHeader.style.display = 'flex'
    fileHeader.style.alignItems = 'center'
    fileHeader.style.marginBottom = '4px'

    const fileIcon = fileHeader.createSpan()
    fileIcon.textContent = '📄'
    fileIcon.style.marginRight = '8px'
    fileIcon.style.fontSize = '16px'

    const fileNameEl = fileHeader.createSpan()
    fileNameEl.textContent = fileName
    fileNameEl.style.fontWeight = '500'
    fileNameEl.style.color = 'var(--text-normal)'

    // File path
    if (this.currentNotePath) {
      const pathEl = infoEl.createDiv()
      pathEl.style.fontSize = '12px'
      pathEl.style.color = 'var(--text-muted)'
      pathEl.style.fontFamily = 'monospace'
      pathEl.textContent = this.currentNotePath
    }
  }

  // Set empty state when no tags available
  private setEmptyState(): void {
    // SuggestModal doesn't have promptEl, we'll handle it differently
    const result = this.resultContainerEl
    if (result) {
      result.empty()
      result.createEl('div', {
        text: 'No tags found',
        cls: 'prompt-instructions'
      })
    }
  }

  // Add instructions exactly like reference
  private addInstructions(): void {
    // SuggestModal doesn't have promptEl, we'll use the result container
    const result = this.resultContainerEl
    if (result && this.tagMappings.length > 0) {
      // Add instructions at the top of results
      const instructionsEl = result.createEl('div', {
        text: 'Choose a tag to organize your note. The note will be moved to the corresponding folder.',
        cls: 'prompt-instructions'
      })
      instructionsEl.style.fontWeight = '600'
      instructionsEl.style.color = 'var(--text-normal)'
      instructionsEl.style.marginBottom = '12px'
    }
  }

  // Handle selection resolution
  private resolveSelection(mapping: PathMappingResult): void {
    const result: TagSelectionResult = {
      selectedTag: mapping.tag,
      targetPath: mapping.path,
      createFolder: true, // Default values
      updateLinks: true,
      createBackup: true
    }

    // Emit event for analytics
    eventEmitter.emit('tag-selection-changed', {
      selectedTag: result.selectedTag,
      targetPath: result.targetPath,
      valid: mapping.valid
    })

    this.onResolve(result)
    this.close()
  }

  // Public method to get result promise
  public getResult(): Promise<TagSelectionResult> {
    return new Promise((resolve) => {
      this.onResolve = resolve
    })
  }

  
  private addReferenceStyles(): void {
    // Add styles exactly from reference
    const style = document.createElement('style')
    style.textContent = `
      .tag-selection-modal .suggestion-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 4px;
        margin: 2px 0;
        background-color: transparent !important;
        isolation: isolate;
      }

      .tag-selection-modal .suggestion-item:hover {
        background-color: var(--background-modifier-hover) !important;
      }

      .tag-selection-modal .tag-icon {
        color: var(--text-accent);
        font-weight: bold;
        margin-right: 8px;
        font-size: 14px;
      }

      .tag-selection-modal .tag-text {
        font-weight: 500;
        color: var(--text-normal);
        margin-right: 8px;
        flex: 1;
      }

      .tag-selection-modal .tag-preview {
        font-size: 12px;
        color: var(--text-muted);
        font-family: monospace;
        opacity: 0.8;
      }

      .tag-selection-modal .prompt {
        font-weight: 600;
        color: var(--text-normal);
      }

      .tag-selection-modal .prompt-instructions {
        color: var(--text-muted);
        font-size: 12px;
      }

      .tag-selection-modal .tag-selection-info {
        padding: 12px 16px;
        background-color: var(--background-secondary);
        border-bottom: 1px solid var(--background-modifier-border);
        position: relative;
      }

      .tag-selection-modal .tag-selection-info::before {
        content: '';
        position: absolute;
        left: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 4px;
        background-color: var(--text-accent);
        border-radius: 50%;
      }

      .tag-selection-modal .tag-selection-info::after {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background-color: var(--interactive-accent);
        border-top-left-radius: 4px;
        border-bottom-left-radius: 4px;
      }

      .tag-selection-modal .modal-close-button {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        cursor: pointer;
        border-radius: 4px;
        color: var(--text-muted);
        transition: all 0.2s ease;
      }

      .tag-selection-modal .modal-close-button:hover {
        background-color: var(--background-modifier-hover);
        color: var(--text-normal);
      }

      .tag-selection-modal .modal-close-button::before {
        content: '×';
        font-size: 18px;
        line-height: 1;
      }
    `

    // Add styles to modal
    this.modalEl.appendChild(style)
  }
}
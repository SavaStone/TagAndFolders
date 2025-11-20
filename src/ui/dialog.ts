/**
 * Base Dialog System - Modal dialog management for TagFolder plugin
 */

import { App, Modal, Setting, Notice, ButtonComponent } from 'obsidian'
import type { ConflictResolution } from '@/types/entities.js'
import { eventEmitter } from '@/utils/events.js'

/**
 * Dialog result interface
 */
export interface DialogResult<T = any> {
  /** Whether dialog was confirmed or cancelled */
  confirmed: boolean
  /** Dialog result data */
  data?: T
  /** User's choice if applicable */
  choice?: string
  /** Timestamp when dialog was closed */
  timestamp: Date
}

/**
 * Dialog options
 */
export interface DialogOptions {
  /** Dialog title */
  title: string
  /** Dialog content */
  content?: string
  /** Dialog width */
  width?: number
  /** Dialog height */
  height?: number
  /** Whether dialog can be closed without action */
  closable?: boolean
  /** Show cancel button */
  showCancel?: boolean
  /** Custom button labels */
  buttonLabels?: {
    confirm?: string
    cancel?: string
  }
  /** Dialog type for styling */
  type?: 'info' | 'warning' | 'error' | 'success' | 'question'
}

/**
 * Base modal dialog class
 */
export abstract class BaseDialog<T = any> extends Modal {
  protected result: Promise<DialogResult<T>>
  protected resolveResult!: (result: DialogResult<T>) => void
  protected options: DialogOptions

  constructor(app: App, options: DialogOptions) {
    super(app)
    this.options = {
      closable: true,
      showCancel: true,
      width: 500,
      height: 400, // Updated from reference default
      type: 'info',
      ...options
    }

    this.result = new Promise((resolve) => {
      this.resolveResult = resolve
    })
  }

  override onOpen(): void {
    const { contentEl } = this

    // Add dialog container
    contentEl.empty()
    contentEl.addClass('tagfolder-dialog')
    contentEl.addClass(`tagfolder-dialog-${this.options.type || 'info'}`)

    // Set modal dimensions using reference design pattern
    if (this.modalEl) {
      this.modalEl.style.width = `${this.options.width || 500}px`
      this.modalEl.style.height = `${this.options.height || 400}px`
    }

    // Create header
    this.createHeader()

    // Create content
    this.createContent()

    // Create footer with buttons
    this.createFooter()

    // Focus management
    this.setupFocusManagement()

    // Emit dialog opened event
    eventEmitter.emit('dialog-opened', {
      type: this.constructor.name,
      data: this.options
    })
  }

  override onClose(): void {
    // If dialog is closed without explicit action, treat as cancelled
    if (this.resolveResult) {
      this.resolveResult({
        confirmed: false,
        timestamp: new Date()
      })
    }

    // Emit dialog closed event
    eventEmitter.emit('dialog-closed', {
      type: this.constructor.name
    })
  }

  /**
   * Get the dialog result promise
   */
  getResult(): Promise<DialogResult<T>> {
    return this.result
  }

  /**
   * Create dialog header
   */
  protected createHeader(): void {
    const { contentEl } = this

    const headerEl = contentEl.createDiv('tagfolder-dialog-header')

    if (this.options.type) {
      const iconEl = headerEl.createSpan('tagfolder-dialog-icon')
      iconEl.innerHTML = this.getTypeIcon(this.options.type)
    }

    const titleEl = headerEl.createEl('h2', { text: this.options.title })
    titleEl.addClass('tagfolder-dialog-title')
  }

  /**
   * Create dialog content
   */
  protected abstract createContent(): void

  /**
   * Create dialog footer with buttons
   */
  protected createFooter(): void {
    const { contentEl } = this

    // Use the new button container method for proper styling
    const footerEl = this.createButtonContainer()

    // Cancel button
    if (this.options.showCancel) {
      const cancelButton = new ButtonComponent(footerEl)
        .setButtonText(this.options.buttonLabels?.cancel || 'Cancel')
        .onClick(() => {
          this.handleCancel()
        })

      // Remove mod-cta from cancel button to make it secondary
      cancelButton.buttonEl.removeClass('mod-cta')
    }

    // Confirm button
    const confirmButton = new ButtonComponent(footerEl)
      .setButtonText(this.options.buttonLabels?.confirm || 'OK')
      .setCta()
      .onClick(() => {
        this.handleConfirm()
      })
  }

  /**
   * Handle confirm action
   */
  protected async handleConfirm(): Promise<void> {
    try {
      const data = await this.onConfirm()
      this.resolveResult({
        confirmed: true,
        data,
        timestamp: new Date()
      })
      this.close()
    } catch (error) {
      console.error('Dialog confirmation error:', error)
      new Notice('An error occurred while processing your request')
    }
  }

  /**
   * Handle cancel action
   */
  protected handleCancel(): void {
    this.resolveResult({
      confirmed: false,
      timestamp: new Date()
    })
    this.close()
  }

  /**
   * Called when dialog is confirmed
   */
  protected abstract onConfirm(): Promise<T>

  /**
   * Setup focus management for keyboard navigation
   */
  protected setupFocusManagement(): void {
    // Add keyboard event listeners
    this.scope.register([], 'Enter', () => {
      this.handleConfirm()
    })

    this.scope.register([], 'Escape', () => {
      if (this.options.closable !== false) {
        this.handleCancel()
      }
    })
  }

  /**
   * Get icon for dialog type
   */
  private getTypeIcon(type: string): string {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      question: '❓'
    }
    return icons[type as keyof typeof icons] || icons.info
  }

  /**
   * Create a styled container exactly like reference
   */
  protected createContainer(className?: string): HTMLDivElement {
    const container = this.contentEl.createDiv("tagfolder-modal-container")
    container.style.padding = "20px"
    container.style.maxHeight = "60vh"
    container.style.overflowY = "auto"

    if (className) {
      container.addClass(className)
    }

    return container
  }

  /**
   * Create a button container exactly like reference
   */
  protected createButtonContainer(): HTMLDivElement {
    const container = this.contentEl.createDiv("tagfolder-modal-buttons")
    container.style.display = "flex"
    container.style.justifyContent = "flex-end"
    container.style.gap = "10px"
    container.style.marginTop = "20px"
    container.style.paddingTop = "20px"
    container.style.borderTop = "1px solid var(--background-modifier-border)"
    return container
  }

  /**
   * Create an info box exactly like reference
   */
  protected createInfoBox(container: HTMLElement, content: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): HTMLElement {
    const infoBox = container.createDiv('tagfolder-info-box')
    infoBox.textContent = content

    // Type-specific styling like reference
    switch (type) {
      case 'info':
        infoBox.style.backgroundColor = 'var(--background-secondary)'
        infoBox.style.color = 'var(--text-muted)'
        infoBox.style.borderLeft = '4px solid var(--interactive-accent)'
        break
      case 'warning':
        infoBox.style.backgroundColor = 'var(--background-warning)'
        infoBox.style.color = 'var(--text-warning)'
        infoBox.style.borderLeft = '4px solid var(--text-warning)'
        break
      case 'error':
        infoBox.style.backgroundColor = 'var(--background-error)'
        infoBox.style.color = 'var(--text-error)'
        infoBox.style.borderLeft = '4px solid var(--text-error)'
        break
      case 'success':
        infoBox.style.backgroundColor = 'var(--background-success)'
        infoBox.style.color = 'var(--text-success)'
        infoBox.style.borderLeft = '4px solid var(--text-success)'
        break
    }

    infoBox.style.padding = '12px'
    infoBox.style.margin = '10px 0'
    infoBox.style.borderRadius = '4px'

    return infoBox
  }
}

/**
 * Simple information dialog
 */
export class InfoDialog extends BaseDialog {
  constructor(app: App, options: DialogOptions) {
    super(app, options)
  }

  protected createContent(): void {
    const { contentEl } = this

    if (this.options.content) {
      const contentTextEl = contentEl.createDiv('tagfolder-dialog-content')
      contentTextEl.innerHTML = this.options.content
    }
  }

  protected async onConfirm(): Promise<void> {
    // No additional data needed for info dialog
  }
}

/**
 * Confirmation dialog
 */
export class ConfirmDialog extends BaseDialog<boolean> {
  constructor(app: App, options: DialogOptions) {
    super(app, {
      ...options,
      buttonLabels: {
        confirm: 'Yes',
        cancel: 'No'
      }
    })
  }

  protected createContent(): void {
    const { contentEl } = this

    if (this.options.content) {
      const contentTextEl = contentEl.createDiv('tagfolder-dialog-content')
      contentTextEl.innerHTML = this.options.content
    }
  }

  protected async onConfirm(): Promise<boolean> {
    return true
  }
}

/**
 * Error dialog
 */
export class ErrorDialog extends BaseDialog {
  constructor(app: App, title: string, error: Error | string, options?: Partial<DialogOptions>) {
    const errorMessage = error instanceof Error ? error.message : error
    const stackTrace = error instanceof Error ? error.stack : undefined

    super(app, {
      title,
      content: `<div class="tagfolder-error-message">${errorMessage}</div>${
        stackTrace ? `<details class="tagfolder-error-details"><summary>Details</summary><pre>${stackTrace}</pre></details>` : ''
      }`,
      type: 'error',
      showCancel: false,
      buttonLabels: {
        confirm: 'OK'
      },
      ...options
    })
  }

  protected createContent(): void {
    // Content is already set in constructor
  }

  protected async onConfirm(): Promise<void> {
    // No additional data needed
  }
}

/**
 * Loading dialog with progress
 */
export class LoadingDialog extends BaseDialog {
  private progressEl!: HTMLDivElement
  private messageEl!: HTMLDivElement

  constructor(app: App, title: string, options?: Partial<DialogOptions>) {
    super(app, {
      title,
      type: 'info',
      showCancel: false,
      closable: false,
      ...options
    })
  }

  protected createContent(): void {
    const { contentEl } = this

    this.messageEl = contentEl.createDiv('tagfolder-loading-message')
    this.progressEl = contentEl.createDiv('tagfolder-loading-progress')

    // Create progress bar
    const progressBar = this.progressEl.createDiv('tagfolder-progress-bar')
    const progressFill = progressBar.createDiv('tagfolder-progress-fill')
    progressFill.style.width = '0%'
  }

  /**
   * Update progress
   */
  updateProgress(message: string, percentage: number = 0): void {
    if (this.messageEl) {
      this.messageEl.textContent = message
    }

    const progressFill = this.progressEl?.querySelector('.tagfolder-progress-fill') as HTMLElement
    if (progressFill) {
      progressFill.style.width = `${Math.max(0, Math.min(100, percentage))}%`
    }
  }

  protected async onConfirm(): Promise<void> {
    // Loading dialog cannot be confirmed
  }
}

/**
 * Dialog factory for creating common dialog types
 */
export class DialogFactory {
  constructor(private app: App) {}

  /**
   * Show information dialog
   */
  async showInfo(title: string, message: string, options?: Partial<DialogOptions>): Promise<void> {
    const dialog = new InfoDialog(this.app, {
      title,
      content: message,
      ...options
    })

    dialog.open()
    await dialog.getResult()
  }

  /**
   * Show confirmation dialog
   */
  async showConfirm(
    title: string,
    message: string,
    options?: Partial<DialogOptions>
  ): Promise<boolean> {
    const dialog = new ConfirmDialog(this.app, {
      title,
      content: message,
      ...options
    })

    dialog.open()
    const result = await dialog.getResult()
    return result.confirmed
  }

  /**
   * Show error dialog
   */
  async showError(title: string, error: Error | string, options?: Partial<DialogOptions>): Promise<void> {
    const dialog = new ErrorDialog(this.app, title, error, options)
    dialog.open()
    await dialog.getResult()
  }

  /**
   * Show loading dialog
   */
  showLoading(title: string = 'Loading...', options?: Partial<DialogOptions>): LoadingDialog {
    const dialog = new LoadingDialog(this.app, title, options)
    dialog.open()
    return dialog
  }
}
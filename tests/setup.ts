/**
 * Test setup file for Vitest
 */

import { vi } from 'vitest'

// Mock Obsidian API
(globalThis as any).vi = vi

// Create comprehensive mock for Obsidian module
const mockTFile = vi.fn().mockImplementation((path: string) => ({
  path,
  basename: path.split('/').pop() || path,
  extension: path.split('.').pop() || '',
  stat: {
    mtime: Date.now(),
    size: 1000
  }
}))

const mockTFolder = vi.fn().mockImplementation((path: string) => ({
  path,
  name: path.split('/').pop() || path,
  children: []
}))

const mockApp = vi.fn().mockImplementation(() => ({
  vault: {
    getAbstractFileByPath: vi.fn(),
    getFileByPath: vi.fn(),
    getFolderByPath: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    rename: vi.fn()
  },
  workspace: {
    getActiveFile: vi.fn(),
    getLeaf: vi.fn()
  }
}))

// Mock Obsidian module with comprehensive implementation
vi.mock('obsidian', () => ({
  App: mockApp,
  TFile: mockTFile,
  TFolder: mockTFolder,
  TAbstractFile: vi.fn(),
  Notice: vi.fn().mockImplementation((message: string) => ({
    message,
    noticeEl: document.createElement('div')
  })),
  Modal: vi.fn().mockImplementation(() => ({
    open: vi.fn(),
    close: vi.fn(),
    onOpen: vi.fn(),
    onClose: vi.fn()
  })),
  Setting: vi.fn().mockImplementation(() => ({
    setName: vi.fn(),
    setDesc: vi.fn(),
    addToggle: vi.fn(),
    addText: vi.fn(),
    addSlider: vi.fn(),
    addDropdown: vi.fn(),
    addButton: vi.fn()
  })),
  Plugin: vi.fn(),
  Workspace: vi.fn(),
  Vault: vi.fn(),
  FileSystemAdapter: vi.fn(),
  Platform: {
    isMac: false,
    isWin: true,
    isLinux: false
  },
  normalizePath: vi.fn((path: string) => path.replace(/\\/g, '/')),
  getLinkpath: vi.fn((link: string) => link.split('|')[0]),
  moment: {
    format: vi.fn(() => '2024-01-01'),
    fromNow: vi.fn(() => '2 hours ago')
  }
}))

// Mock global objects
global.crypto = {
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
} as Crypto

// Set up DOM environment
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000'
  },
  writable: true
})

// Mock performance API for performance tests
global.performance = {
  ...global.performance,
  now: vi.fn(() => Date.now())
}

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}
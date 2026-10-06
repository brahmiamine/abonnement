import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  localStorage.clear()
  window.location.hash = ''
  delete document.documentElement.dataset.theme
})

window.scrollTo = (() => {}) as typeof window.scrollTo

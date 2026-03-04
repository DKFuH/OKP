import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MaterialBrowser } from './MaterialBrowser.js'

describe('MaterialBrowser (SSR)', () => {
  it('renders heading and create action', () => {
    const html = renderToString(React.createElement(MaterialBrowser))

    expect(html).toContain('Material-Browser')
    expect(html).toContain('Material erstellen')
  })

  it('renders search and category controls', () => {
    const html = renderToString(React.createElement(MaterialBrowser))

    expect(html).toContain('Material suchen')
    expect(html).toContain('Alle Kategorien')
  })
})

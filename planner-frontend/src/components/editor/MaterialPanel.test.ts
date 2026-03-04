import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MaterialPanel } from './MaterialPanel.js'

describe('MaterialPanel (SSR)', () => {
  it('renders heading and apply action', () => {
    const html = renderToString(
      React.createElement(MaterialPanel, {
        projectId: 'project-1',
        room: null,
        onApplied: () => {},
      }),
    )

    expect(html).toContain('Materialzuweisung')
    expect(html).toContain('Zuweisung anwenden')
  })

  it('shows idle guidance and disabled apply without room', () => {
    const html = renderToString(
      React.createElement(MaterialPanel, {
        projectId: 'project-1',
        room: null,
        onApplied: () => {},
      }),
    )

    expect(html).toContain('Materialzuweisung auswählen und anwenden.')
    expect(html).toMatch(/<button[^>]*disabled[^>]*>[^<]*Zuweisung anwenden/)
  })
})

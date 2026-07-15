import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarkdownView } from './MarkdownView'

describe('MarkdownView', () => {
  it('renders GFM tables, checklists and highlighted code', () => {
    render(<MarkdownView>{`## 结果\n\n- [x] 完成\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n\`\`\`ts\nconst ok = true\n\`\`\``}</MarkdownView>)
    expect(screen.getByRole('heading', { name: '结果' })).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.getByText((_, element) => element?.tagName === 'CODE' && element.textContent?.includes('const ok = true') === true)).toBeInTheDocument()
  })
})

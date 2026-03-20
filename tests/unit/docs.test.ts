import { describe, expect, it } from 'vitest'
import { parseMarkdownSections } from '../../lib/docs'

describe('parseMarkdownSections', () => {
  it('splits markdown into sections by headings', () => {
    const sections = parseMarkdownSections('# Title\nhello\n## Next\nworld')
    expect(sections[0]?.heading).toBe('Title')
    expect(sections[1]?.heading).toBe('Next')
  })
})

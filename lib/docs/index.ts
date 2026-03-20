import { promises as fs } from 'fs'
import path from 'path'

const DOCS_DIR = path.join(process.cwd(), 'docs')

export const DOC_FILE_MAP = {
  architecture: 'architecture.md',
  workflowMap: 'workflow-map.md',
  moduleSpecs: 'module-specs.md',
  userGuide: 'user-guide.md',
  operatorGuide: 'operator-guide.md',
  aiChatbotGuide: 'ai-chatbot-guide.md',
  deployment: 'deployment.md',
  envSetup: 'env-setup.md',
  prototypeConstraints: 'prototype-constraints.md',
  implementationNotes: 'implementation-notes.md',
} as const

export async function getDocContent(filename: string) {
  return fs.readFile(path.join(DOCS_DIR, filename), 'utf8')
}

export async function searchDocs(query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return []

  const entries = await Promise.all(
    Object.entries(DOC_FILE_MAP).map(async ([key, file]) => {
      const content = await getDocContent(file)
      const lines = content.split(/\r?\n/)
      const matches = lines
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => line.toLowerCase().includes(needle))
        .slice(0, 4)
        .map(({ line, index }) => ({ line: line.trim(), lineNumber: index + 1 }))
      return { key, file, matches }
    }),
  )

  return entries.filter((entry) => entry.matches.length > 0)
}

export function parseMarkdownSections(markdown: string) {
  const lines = markdown.split(/\r?\n/)
  const sections: Array<{ heading: string; level: number; body: string[] }> = []
  let current = { heading: 'Overview', level: 1, body: [] as string[] }

  for (const line of lines) {
    const match = /^(#{1,6})\s+(.*)$/.exec(line)
    if (match) {
      if (current.body.length || current.heading !== 'Overview') sections.push(current)
      current = { heading: match[2].trim(), level: match[1].length, body: [] }
      continue
    }
    current.body.push(line)
  }

  if (current.body.length || current.heading !== 'Overview') sections.push(current)
  return sections
}

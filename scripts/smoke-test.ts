import { access } from 'fs/promises'
import path from 'path'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const ROUTES = ['/', '/dashboard', '/qc', '/inventory', '/issues', '/recovery', '/chatbot', '/help', '/api/health']
const FILES = [
  'README.md',
  'docs/user-guide.md',
  'docs/architecture.md',
  'app/(dashboard)/chatbot/page.tsx',
  'app/api/chat/route.ts',
  'lib/ai/provider-router.ts',
]

async function canFetch(url: string) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 1500)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}

async function runHttpSmoke() {
  let passed = 0
  for (const route of ROUTES) {
    const url = `${BASE_URL}${route}`
    try {
      const response = await fetch(url)
      console.log(`${response.ok ? '✓' : '✗'} ${url} -> ${response.status}`)
      if (response.ok) passed += 1
    } catch (error: any) {
      console.log(`✗ ${url} -> ${error.message}`)
    }
  }
  return passed === ROUTES.length
}

async function runFilesystemSmoke() {
  let passed = 0
  for (const file of FILES) {
    const fullPath = path.join(process.cwd(), file)
    try {
      await access(fullPath)
      console.log(`✓ ${file}`)
      passed += 1
    } catch {
      console.log(`✗ ${file}`)
    }
  }
  return passed === FILES.length
}

async function main() {
  const healthReachable = await canFetch(`${BASE_URL}/api/health`)
  const ok = healthReachable ? await runHttpSmoke() : await runFilesystemSmoke()
  if (!ok) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

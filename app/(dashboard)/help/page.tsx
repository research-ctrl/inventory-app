import { PageHeader } from '@/components/shared/page-header'
import { getDocContent, parseMarkdownSections } from '@/lib/docs'

export const metadata = { title: 'Help | SMLS' }

export default async function Page() {
  const markdown = await getDocContent('user-guide.md')
  const sections = parseMarkdownSections(markdown)

  return (
    <div className="space-y-6">
      <PageHeader title="In-app help" description="The operator guide below is rendered directly from docs/user-guide.md so the in-app guide stays aligned with repository documentation." />
      <div className="space-y-4">
        {sections.map((section) => (
          <section key={`${section.level}-${section.heading}`} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{section.heading}</h2>
            <div className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
              {section.body.filter(Boolean).map((line, index) => {
                if (line.startsWith('- ')) return <p key={index} className="ml-4">• {line.slice(2)}</p>
                if (/^\d+\.\s/.test(line)) return <p key={index} className="font-medium text-slate-800">{line}</p>
                return <p key={index}>{line}</p>
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

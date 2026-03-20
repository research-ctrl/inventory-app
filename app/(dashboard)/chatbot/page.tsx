import { PageHeader } from '@/components/shared/page-header'
import { ChatbotPanel } from '@/components/chatbot/chatbot-panel'

export const metadata = { title: 'AI Assistant | SMLS' }

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Operations Assistant"
        description="Grounded operational help for stock, status tracking, genealogy, recovery, and prototype workflow guidance."
      />
      <ChatbotPanel />
    </div>
  )
}

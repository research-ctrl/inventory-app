import { redirect } from 'next/navigation'

interface PageProps {
  searchParams: Promise<{ po_id?: string }>
}

export default async function ReceivingNewRedirect({ searchParams }: PageProps) {
  const { po_id } = await searchParams
  redirect(po_id ? `/procurement/deliveries/new?po_id=${po_id}` : '/procurement/deliveries/new')
}

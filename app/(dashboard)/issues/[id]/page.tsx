import { redirect } from 'next/navigation'

export default async function IssuesDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/issued/${id}`)
}

'use server'
import { createClient } from '@/lib/supabase/server'
import type { CreateRequirementInput } from '@/lib/validations/requirement'

export async function dbCreateRequirement(input: CreateRequirementInput, userId: string) {
  const sb = await createClient()
  const { items, ...req } = input

  const { data: requirement, error } = await sb
    .from('requirements')
    .insert({ ...req, requested_by: userId, status: 'draft' })
    .select()
    .single()
  if (error) throw new Error(error.message)

  if (items.length > 0) {
    const { error: itemError } = await sb.from('requirement_items').insert(
      items.map((item) => ({ ...item, requirement_id: requirement.id }))
    )
    if (itemError) throw new Error(itemError.message)
  }
  return requirement
}

export async function dbUpdateRequirement(id: string, input: Partial<CreateRequirementInput>) {
  const sb = await createClient()
  const { items, ...req } = input

  const { data, error } = await sb
    .from('requirements')
    .update(req)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)

  if (items !== undefined) {
    await sb.from('requirement_items').delete().eq('requirement_id', id)
    if (items.length > 0) {
      await sb.from('requirement_items').insert(
        items.map((item) => ({ ...item, requirement_id: id }))
      )
    }
  }
  return data
}

export async function dbTransitionRequirement(id: string, toStatus: string, actorId: string, comment?: string) {
  const sb = await createClient()
  const { data: current } = await sb.from('requirements').select('status').eq('id', id).single()

  const { error } = await sb.from('requirements').update({
    status: toStatus as any,
    ...(toStatus === 'approved' ? { approved_by: actorId, approved_at: new Date().toISOString() } : {}),
    ...(toStatus === 'rejected' ? { rejection_reason: comment } : {}),
  }).eq('id', id)
  if (error) throw new Error(error.message)

  await sb.from('workflow_history').insert({
    entity_type: 'requirement',
    entity_id: id,
    from_status: current?.status as any,
    to_status: toStatus as any,
    event: toStatus as any,
    actor_id: actorId,
    comment,
  })
}

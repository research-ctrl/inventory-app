import { createClient } from '@/lib/supabase/server'

export type PrototypeOperatorPayload = {
  name?: string
  team?: string
  badge?: string
}

export function parsePrototypeOperator(input: FormData | { operatorName?: unknown; operatorTeam?: unknown; operatorBadge?: unknown }): PrototypeOperatorPayload {
  const getValue = (key: string) => {
    if (input instanceof FormData) return input.get(key)
    return input[key as keyof typeof input]
  }

  const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

  return {
    name: asText(getValue('operatorName')) || 'Unassigned operator',
    team: asText(getValue('operatorTeam')) || undefined,
    badge: asText(getValue('operatorBadge')) || undefined,
  }
}

export function formatOperatorLabel(operator: PrototypeOperatorPayload) {
  return [operator.name, operator.team].filter(Boolean).join(' · ')
}

export async function resolvePrototypeActorId(roleHint?: string) {
  const supabase = await createClient()

  if (roleHint) {
    const preferred = await supabase
      .from('profiles')
      .select('id, role')
      .eq('is_active', true)
      .eq('role', roleHint)
      .limit(1)
      .maybeSingle()

    if (preferred.data?.id) return preferred.data.id as string
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('No active prototype operator profile is available in profiles.')
  return data.id as string
}

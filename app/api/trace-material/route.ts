import { NextRequest, NextResponse } from 'next/server'
import { getTraceabilityForPin } from '@/lib/db/queries/lifecycle'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const pinId = searchParams.get('pinId')
  if (!pinId) {
    return NextResponse.json({ error: 'pinId required' }, { status: 400 })
  }

  try {
    const trace = await getTraceabilityForPin(pinId)
    return NextResponse.json(trace)
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? 'Trace lookup failed.' }, { status: 500 })
  }
}

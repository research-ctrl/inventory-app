// Server-side only — vendor scoring logic for comparison feature.
// Import only from server components or server actions.

export type ScoredVendor = {
  id: string
  code: string
  name: string
  trade_name: string | null
  email: string | null
  phone: string | null
  category: string | null
  city: string | null
  country: string | null
  rating: number | null
  payment_terms_days: number | null
  currency: string | null
  is_approved: boolean
  blacklisted: boolean
  created_at: string
  // purchase_orders comes from the comparison query join
  purchase_orders?: Array<{ id: string; status: string; created_at: string }>
  score: {
    rating: number        // 0–25
    payment_terms: number // 0–20
    delivery_history: number // 0–25
    po_count: number      // 0–15
    recent_activity: number  // 0–15
    total: number         // 0–100
  }
  rank: number
}

export function scoreVendors(vendors: any[]): ScoredVendor[] {
  const now = Date.now()
  const MS_90_DAYS = 90 * 24 * 60 * 60 * 1000
  const MS_180_DAYS = 180 * 24 * 60 * 60 * 1000

  const scored = vendors.map((vendor) => {
    const pos: Array<{ id: string; status: string; created_at: string }> =
      vendor.purchase_orders ?? []

    // Rating: 0–25 points
    const ratingScore = vendor.rating != null ? (vendor.rating / 5) * 25 : 0

    // Payment terms: 0–20 points — 30 days = max, each day above 30 loses 0.3 pts
    const paymentTermsScore = Math.max(
      0,
      20 - ((vendor.payment_terms_days ?? 30) - 30) * 0.3
    )

    // PO count: 0–15 — 2 pts per PO, capped at 15
    const poCountScore = Math.min(15, pos.length * 2)

    // Recent activity: 15 pts if PO in last 90 days, 8 pts if in last 180 days, else 0
    const hasRecent90 = pos.some(
      (po) => now - new Date(po.created_at).getTime() < MS_90_DAYS
    )
    const hasRecent180 = pos.some(
      (po) => now - new Date(po.created_at).getTime() < MS_180_DAYS
    )
    const recentActivityScore = hasRecent90 ? 15 : hasRecent180 ? 8 : 0

    // Delivery history: closed POs / total POs * 25, or neutral 10 if no POs
    const totalPos = pos.length
    const closedPos = pos.filter((po) => po.status === 'closed').length
    const deliveryHistoryScore =
      totalPos > 0 ? (closedPos / totalPos) * 25 : 10

    const total =
      ratingScore +
      paymentTermsScore +
      poCountScore +
      recentActivityScore +
      deliveryHistoryScore

    return {
      ...vendor,
      score: {
        rating: Math.round(ratingScore * 10) / 10,
        payment_terms: Math.round(paymentTermsScore * 10) / 10,
        delivery_history: Math.round(deliveryHistoryScore * 10) / 10,
        po_count: poCountScore,
        recent_activity: recentActivityScore,
        total: Math.round(total * 10) / 10,
      },
      rank: 0, // set below after sorting
    } as Omit<ScoredVendor, 'rank'> & { rank: number }
  })

  // Sort descending by total score
  scored.sort((a, b) => b.score.total - a.score.total)

  // Assign rank 1, 2, 3...
  return scored.map((v, idx) => ({ ...v, rank: idx + 1 }))
}

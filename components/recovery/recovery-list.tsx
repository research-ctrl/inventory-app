'use client'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ClipboardList, AlertCircle, CheckCircle2, Package, Wrench, Trash2, ChevronDown } from 'lucide-react'
import AssessRecoveryModal from './assess-recovery-modal'

interface Recovery {
  id: string
  recovery_ref: string
  issue_id: string
  pin_id: string
  quantity_returned: number
  status: string
  condition_grade: string | null
  condition_notes: string | null
  outcome: string | null
  created_at: string
  issue: {
    issue_number: string
    purpose: string
    vessel: { name: string } | null
    issued_to_profile: { full_name: string | null }
  }
  pin: {
    pin_number: string
    description: string
    unit: string
  }
}

interface RecoveryListProps {
  recoveries: Recovery[]
}

export default function RecoveryList({ recoveries }: RecoveryListProps) {
  const [selectedRecovery, setSelectedRecovery] = useState<Recovery | null>(null)

  const pending = recoveries.filter(r => r.status === 'pending_assessment')
  const completed = recoveries.filter(r => r.status === 'closed')

  if (recoveries.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
        <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-700">No recoveries found</h3>
        <p className="text-sm text-gray-400 mt-1">Returned items awaiting assessment will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Pending Assessment Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-600">
          <span>Pending Assessment</span>
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px]">{pending.length}</span>
        </div>

        {pending.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pending.map((rec) => (
              <div key={rec.id} className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 flex-1 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                      {rec.recovery_ref}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {formatDistanceToNow(new Date(rec.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{rec.pin.description}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{rec.pin.pin_number}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-2 border-y border-gray-50">
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 uppercase">Quantity</p>
                      <p className="text-sm font-semibold">{rec.quantity_returned} {rec.pin.unit}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 uppercase">From Issue</p>
                      <p className="text-sm font-semibold text-blue-600">{rec.issue.issue_number}</p>
                    </div>
                  </div>

                  {rec.condition_notes && (
                    <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 italic">
                      "{rec.condition_notes}"
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectedRecovery(rec)}
                  className="w-full py-2.5 bg-amber-600 text-white text-xs font-bold uppercase tracking-wide hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  Assess Condition
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 bg-gray-50 rounded-lg p-6 text-center border border-dashed">
            No items currently awaiting assessment.
          </p>
        )}
      </section>

      {/* Completed Assessments Section */}
      {completed.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500">
            <span>Recent Assessments</span>
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px]">{completed.length}</span>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ref / Date</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Outcome</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {completed.slice(0, 10).map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-mono text-xs font-bold text-gray-800">{rec.recovery_ref}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(rec.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{rec.pin.description}</p>
                      <p className="text-xs text-gray-500 font-mono">{rec.pin.pin_number}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {rec.quantity_returned} {rec.pin.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        rec.condition_grade === 'A' || rec.condition_grade === 'B' ? 'bg-green-100 text-green-800' :
                        rec.condition_grade === 'C' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Grade {rec.condition_grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {rec.outcome === 'reuse' && <Package className="h-3.5 w-3.5 text-green-500" />}
                        {rec.outcome === 'repair' && <Wrench className="h-3.5 w-3.5 text-amber-500" />}
                        {rec.outcome === 'scrap' && <Trash2 className="h-3.5 w-3.5 text-red-500" />}
                        <span className="text-xs font-medium capitalize text-gray-700">{rec.outcome}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selectedRecovery && (
        <AssessRecoveryModal
          recovery={selectedRecovery}
          onClose={() => setSelectedRecovery(null)}
          onSuccess={() => {
            setSelectedRecovery(null)
          }}
        />
      )}
    </div>
  )
}

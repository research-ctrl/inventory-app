'use client'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { X, CheckCircle2, Package, Wrench, Trash2, AlertTriangle, Send } from 'lucide-react'
import { AssessRecoverySchema, type AssessRecoveryInput } from '@/lib/validations/recovery'
import { assessRecovery } from '@/actions/recovery'
import { useRouter } from 'next/navigation'

interface Props {
  recovery: {
    id: string
    recovery_ref: string
    quantity_returned: number
    pin: {
      pin_number: string
      description: string
      unit: string
    }
  }
  onClose: () => void
  onSuccess: () => void
}

const CONDITION_GRADES = [
  { value: 'A', label: 'Grade A', desc: 'As new / Near perfect', color: 'green' },
  { value: 'B', label: 'Grade B', desc: 'Slight wear, fully functional', color: 'green' },
  { value: 'C', label: 'Grade C', desc: 'Visible wear, needs cleaning/test', color: 'amber' },
  { value: 'D', label: 'Grade D', desc: 'Heavily worn, usage limited', color: 'red' },
  { value: 'scrap', label: 'Scrap', desc: 'Broken / Unusable', color: 'red' },
] as const

const OUTCOMES = [
  { value: 'reuse', label: 'Return to Stock', icon: Package, color: 'green', desc: 'Makes material available for re-issue.' },
  { value: 'repair', label: 'Send for Repair', icon: Wrench, color: 'amber', desc: 'Quarantines the item until it is fixed.' },
  { value: 'scrap', label: 'Write Off', icon: Trash2, color: 'red', desc: 'Removes from tracking, logs reason.' },
] as const

export default function AssessRecoveryModal({ recovery, onClose, onSuccess }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AssessRecoveryInput>({
    resolver: zodResolver(AssessRecoverySchema),
    defaultValues: {
      recovery_id: recovery.id,
      condition_grade: undefined,
      outcome: undefined,
      condition_notes: '',
      disposition_notes: '',
    },
  })

  function handleGradeSelect(grade: string) {
    setSelectedGrade(grade)
    setValue('condition_grade', grade as any)
    
    // Auto-select outcome based on grade to help user
    if (grade === 'A' || grade === 'B') {
      setSelectedOutcome('reuse')
      setValue('outcome', 'reuse')
    } else if (grade === 'C') {
      setSelectedOutcome('repair')
      setValue('outcome', 'repair')
    } else {
      setSelectedOutcome('scrap')
      setValue('outcome', 'scrap')
    }
  }

  function handleOutcomeSelect(outcome: string) {
    setSelectedOutcome(outcome)
    setValue('outcome', outcome as any)
  }

  const onSubmit = (data: AssessRecoveryInput) => {
    startTransition(async () => {
      const result = await assessRecovery(data)
      if (result.success) {
        toast.success(`Recovery assessed as ${data.outcome.toUpperCase()}`)
        onSuccess()
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to assess recovery')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden my-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Assess Condition & Disposition</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Item details context */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="p-2.5 rounded-lg bg-white border border-gray-100 shadow-sm">
              <Package className="h-6 w-6 text-blue-500" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-900 truncate">{recovery.pin.description}</h3>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{recovery.pin.pin_number}</p>
              <p className="text-xs font-semibold text-blue-600 mt-1 uppercase tracking-wide">
                Ref: {recovery.recovery_ref} · Qty: {recovery.quantity_returned} {recovery.pin.unit}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1: Grade */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">1. Condition Grade</label>
              <div className="space-y-2">
                {CONDITION_GRADES.map((g) => (
                  <button
                    key={g.value} type="button" onClick={() => handleGradeSelect(g.value)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      selectedGrade === g.value 
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-50' 
                        : 'border-gray-50 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      g.color === 'green' ? 'bg-green-100 text-green-700' :
                      g.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {g.value.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{g.label}</p>
                      <p className="text-[10px] text-gray-500">{g.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              {errors.condition_grade && <p className="text-xs text-red-600 px-1">{errors.condition_grade.message}</p>}
            </div>

            {/* Step 2: Disposition */}
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">2. Final Disposition</label>
                <div className="space-y-2">
                  {OUTCOMES.map((o) => (
                    <button
                      key={o.value} type="button" onClick={() => handleOutcomeSelect(o.value)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-4 ${
                        selectedOutcome === o.value 
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-50' 
                          : 'border-gray-50 bg-white hover:border-gray-200'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        o.color === 'green' ? 'bg-green-100 text-green-600' :
                        o.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        <o.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{o.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{o.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {errors.outcome && <p className="text-xs text-red-600 px-1">{errors.outcome.message}</p>}
              </div>

              <div className="space-y-1.5 px-1">
                <label className="text-xs font-bold text-gray-700">Disposition Remarks</label>
                <textarea
                  {...register('disposition_notes')}
                  rows={2}
                  placeholder="Final comments on why this decision was made..."
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="text-[11px] text-gray-400 max-w-[50%] flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              This action will update inventory tracking and close the recovery record.
            </div>
            <div className="flex gap-3">
              <button
                type="button" onClick={onClose} disabled={isPending}
                className="px-6 py-2.5 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={isPending || !selectedGrade || !selectedOutcome}
                className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
              >
                {isPending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Submit Assessment
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

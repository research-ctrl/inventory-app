'use server'
import { revalidatePath } from 'next/cache'
import {
  dbStartInspection,
  dbSubmitInspectionResult,
  dbCreateQCReturn,
  dbUpdateQCReturnStatus,
} from '@/lib/db/mutations/qc'
import type { StartInspectionInput, SubmitInspectionInput, QCReturnInput } from '@/lib/validations/qc'
import { StartInspectionSchema, SubmitInspectionSchema, QCReturnSchema } from '@/lib/validations/qc'

export async function startInspection(
  formData: StartInspectionInput,
  operatorId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!operatorId) return { success: false, error: 'Operator identity required' }
    const parsed = StartInspectionSchema.safeParse(formData)
    if (!parsed.success) return { success: false, error: JSON.stringify(parsed.error.flatten()) }
    const data = await dbStartInspection(
      parsed.data.delivery_id,
      parsed.data.remarks,
      parsed.data.pass_criteria,
      operatorId
    )
    revalidatePath('/qc')
    revalidatePath(`/procurement/deliveries/${parsed.data.delivery_id}`)
    revalidatePath(`/qc/inspections/${parsed.data.delivery_id}`)
    return { success: true, data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function submitInspectionResult(
  formData: SubmitInspectionInput,
  operatorId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!operatorId) return { success: false, error: 'Operator identity required' }
    const parsed = SubmitInspectionSchema.safeParse(formData)
    if (!parsed.success) return { success: false, error: JSON.stringify(parsed.error.flatten()) }
    const data = await dbSubmitInspectionResult(parsed.data, operatorId)
    revalidatePath('/qc')
    revalidatePath('/procurement/deliveries')
    return { success: true, data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function createQCReturn(
  formData: QCReturnInput,
  operatorId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!operatorId) return { success: false, error: 'Operator identity required' }
    const parsed = QCReturnSchema.safeParse(formData)
    if (!parsed.success) return { success: false, error: JSON.stringify(parsed.error.flatten()) }
    const data = await dbCreateQCReturn(parsed.data, operatorId)
    revalidatePath('/qc/returns')
    return { success: true, data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateReturnStatus(
  returnId: string,
  status: string,
  replacementDeliveryId: string | undefined,
  operatorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!operatorId) return { success: false, error: 'Operator identity required' }
    await dbUpdateQCReturnStatus(returnId, status, replacementDeliveryId, operatorId)
    revalidatePath('/qc/returns')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

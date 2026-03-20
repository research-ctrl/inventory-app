'use server'
import { revalidatePath } from 'next/cache'
import {
  dbCreateIssue,
  dbSubmitIssue,
  dbApproveIssue,
  dbIssueMaterial,
  dbCaptureUsageOutcome,
  dbRejectIssue,
} from '@/lib/db/mutations/issues'
import { CreateIssueSchema, UsageOutcomeSchema } from '@/lib/validations/issue'
import type { CreateIssueInput, UsageOutcomeInput } from '@/lib/validations/issue'

export async function createIssue(
  formData: CreateIssueInput,
  operatorId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const parsed = CreateIssueSchema.safeParse(formData)
    if (!parsed.success) return { success: false, error: JSON.stringify(parsed.error.flatten()) }
    const data = await dbCreateIssue(parsed.data, operatorId)
    revalidatePath('/issues')
    return { success: true, data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function submitIssue(
  issueId: string,
  operatorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbSubmitIssue(issueId, operatorId)
    revalidatePath('/issues')
    revalidatePath(`/issues/${issueId}`)
    revalidatePath('/approvals')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function approveIssue(
  issueId: string,
  operatorId: string,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbApproveIssue(issueId, operatorId, comment)
    revalidatePath('/issues')
    revalidatePath(`/issues/${issueId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function rejectIssue(
  issueId: string,
  operatorId: string,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbRejectIssue(issueId, operatorId, comment)
    revalidatePath('/issues')
    revalidatePath(`/issues/${issueId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function issueMaterial(
  issueId: string,
  operatorId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const data = await dbIssueMaterial(issueId, operatorId)
    revalidatePath('/issues')
    revalidatePath(`/issues/${issueId}`)
    revalidatePath('/inventory/pins')
    return { success: true, data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function captureUsageOutcome(
  formData: UsageOutcomeInput,
  operatorId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const parsed = UsageOutcomeSchema.safeParse(formData)
    if (!parsed.success) return { success: false, error: JSON.stringify(parsed.error.flatten()) }
    const data = await dbCaptureUsageOutcome(parsed.data, operatorId)
    revalidatePath('/issues')
    revalidatePath(`/issues/${parsed.data.issue_id}`)
    revalidatePath('/recovery')
    revalidatePath('/inventory')
    return { success: true, data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

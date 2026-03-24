"use server";
import { revalidatePath } from 'next/cache';
import { getServerSession } from "@/lib/auth/session";
import { CreateRecoverySchema, AssessRecoverySchema, type CreateRecoveryInput, type AssessRecoveryInput } from "@/lib/validations/recovery";
import { can } from "@/lib/permissions/checks";
import { dbCreateRecovery, dbAssessRecovery } from "@/lib/db/mutations/recoveries";

/**
 * Record a return of material from an issue.
 */
export async function createRecovery(input: CreateRecoveryInput) {
  try {
    const { profile, role } = await getServerSession();
    if (!can(role, 'recovery', 'create')) {
      return { success: false, error: 'Insufficient permissions' };
    }

    const parsed = CreateRecoverySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: JSON.stringify(parsed.error.flatten()) };
    }

    const data = await dbCreateRecovery(parsed.data, profile.id);

    revalidatePath('/recovery');
    revalidatePath(`/issued/${input.issue_id}`);
    revalidatePath('/issued');

    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Assess a recovery record and pick its final disposition.
 */
export async function assessRecovery(input: AssessRecoveryInput) {
  try {
    const { profile, role } = await getServerSession();
    if (!can(role, 'recovery', 'update')) {
      return { success: false, error: 'Insufficient permissions' };
    }

    const parsed = AssessRecoverySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: JSON.stringify(parsed.error.flatten()) };
    }

    const data = await dbAssessRecovery(parsed.data, profile.id);

    revalidatePath('/recovery');
    revalidatePath('/inventory/pins');
    revalidatePath('/inventory');

    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

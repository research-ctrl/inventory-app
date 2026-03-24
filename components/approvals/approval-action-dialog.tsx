'use client';

import { useState, useTransition, useEffect } from 'react';
import { Mail, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { decideApproval } from '@/actions/approvals';
import { getAccountsEmailsList } from '@/actions/settings';
import Link from 'next/link';

interface ApprovalActionDialogProps {
  approvalId: string;
  decision: 'approve' | 'reject';
  entityType?: string | null;
  triggerLabel?: string;
  triggerClassName?: string;
  onSuccess?: () => void;
}

export default function ApprovalActionDialog({
  approvalId,
  decision,
  entityType,
  triggerLabel,
  triggerClassName,
  onSuccess,
}: ApprovalActionDialogProps) {
  const [open, setOpen]              = useState(false);
  const [comment, setComment]        = useState('');
  const [error, setError]            = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Accounts emails state — fetched when approve dialog opens
  const [allEmails, setAllEmails]           = useState<string[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [emailsLoading, setEmailsLoading]   = useState(false);

  const isReject      = decision === 'reject';
  const isRequirement = entityType === 'requirement' || entityType == null;
  const title         = isReject ? 'Reject Request' : 'Approve Request';

  // Fetch accounts emails when approve dialog opens
  useEffect(() => {
    if (!open || isReject) return;
    setEmailsLoading(true);
    getAccountsEmailsList()
      .then((emails) => {
        setAllEmails(emails);
        setSelectedEmails(emails); // select all by default
      })
      .catch(() => { setAllEmails([]); setSelectedEmails([]); })
      .finally(() => setEmailsLoading(false));
  }, [open, isReject]);

  const toggleEmail = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleSubmit = () => {
    if (isReject && !comment.trim()) {
      setError('A rejection reason is required.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await decideApproval(
          approvalId,
          decision,
          comment.trim() || undefined,
          isReject ? undefined : selectedEmails,
        );
        if (result && 'error' in result && result.error) {
          setError(typeof result.error === 'string' ? result.error : 'Action failed.');
          return;
        }
        setOpen(false);
        setComment('');
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      } catch (err: any) {
        setError(err?.message ?? 'Action failed. Please try again.');
      }
    });
  };

  const defaultTriggerCls = isReject
    ? 'rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors'
    : 'rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? defaultTriggerCls}
      >
        {triggerLabel ?? (isReject ? 'Reject' : 'Approve')}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => { if (!isPending) setOpen(false); }}
            aria-hidden="true"
          />

          {/* Dialog */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="approval-dialog-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
              <h2 id="approval-dialog-title" className="text-base font-semibold text-gray-900 mb-1">
                {title}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {isReject
                  ? 'Provide a reason. This will be visible to the requester.'
                  : isRequirement
                    ? 'On approval, a draft PO is auto-created from the requirement items. Choose who on the accounts team to notify.'
                    : 'You can optionally add a comment before approving.'}
              </p>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder={isReject ? 'Rejection reason (required)…' : 'Comment (optional)…'}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

              {/* ── Accounts email selection panel ── */}
              {!isReject && (
                <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <p className="text-xs font-semibold text-blue-800">Notify accounts team</p>
                    </div>
                    {allEmails.length > 1 && (
                      <div className="flex gap-2 text-xs">
                        <button type="button" onClick={() => setSelectedEmails(allEmails)} className="text-blue-600 hover:underline">Select all</button>
                        <span className="text-blue-300">·</span>
                        <button type="button" onClick={() => setSelectedEmails([])} className="text-blue-600 hover:underline">None</button>
                      </div>
                    )}
                  </div>

                  {emailsLoading ? (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                      Loading recipients…
                    </div>
                  ) : allEmails.length > 0 ? (
                    <div className="space-y-1">
                      {allEmails.map((email) => {
                        const checked = selectedEmails.includes(email);
                        return (
                          <button
                            key={email}
                            type="button"
                            onClick={() => toggleEmail(email)}
                            className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                              checked
                                ? 'border-blue-300 bg-white text-blue-900 font-medium shadow-sm'
                                : 'border-transparent text-blue-600 opacity-50 hover:opacity-70'
                            }`}
                          >
                            {checked
                              ? <CheckSquare className="h-4 w-4 text-blue-600 shrink-0" />
                              : <Square className="h-4 w-4 text-blue-400 shrink-0" />
                            }
                            <Mail className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                            {email}
                          </button>
                        );
                      })}
                      {selectedEmails.length === 0 && (
                        <p className="text-xs text-amber-700 flex items-center gap-1 pt-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          No recipients selected — no email will be sent.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-amber-700 font-medium">No accounts emails configured</p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          Approval will proceed without finance notification.{' '}
                          <Link href="/admin" target="_blank" className="underline font-semibold hover:text-amber-800">
                            Add in Settings →
                          </Link>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* What happens note */}
              {!isReject && isRequirement && (
                <div className="mt-3 rounded-lg border border-green-100 bg-green-50 px-3 py-2">
                  <p className="text-xs text-green-800">
                    <strong>On confirm:</strong> requirement approved → draft PO auto-created → selected accounts notified by email with link to edit the PO.
                  </p>
                </div>
              )}

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setOpen(false); setComment(''); setError(null); }}
                  disabled={isPending}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    isReject ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isPending && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {isReject ? 'Confirm Reject' : 'Confirm Approve'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

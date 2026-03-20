'use client';

import { useState, useTransition } from 'react';
import { decideApproval } from '@/actions/approvals';

interface ApprovalActionDialogProps {
  approvalId: string;
  decision: 'approve' | 'reject';
  triggerLabel?: string;
  triggerClassName?: string;
  onSuccess?: () => void;
}

export default function ApprovalActionDialog({
  approvalId,
  decision,
  triggerLabel,
  triggerClassName,
  onSuccess,
}: ApprovalActionDialogProps) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isReject = decision === 'reject';
  const title = isReject ? 'Reject Request' : 'Approve Request';
  const defaultTriggerLabel = isReject ? 'Reject' : 'Approve';

  const handleSubmit = () => {
    if (isReject && !comment.trim()) {
      setError('A rejection reason is required.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        // decideApproval(approvalId, decision, comment?)
        const result = await decideApproval(
          approvalId,
          decision,
          comment.trim() || undefined
        );
        if (result && 'error' in result && result.error) {
          setError(
            typeof result.error === 'string' ? result.error : 'Action failed.'
          );
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
        {triggerLabel ?? defaultTriggerLabel}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Dialog */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="approval-dialog-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
              <h2
                id="approval-dialog-title"
                className="text-base font-semibold text-gray-900 mb-1"
              >
                {title}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {isReject
                  ? 'Provide a reason for rejecting this request. This will be visible to the requester.'
                  : 'You can optionally add a comment before approving this request.'}
              </p>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder={
                  isReject ? 'Rejection reason (required)…' : 'Comment (optional)…'
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Comment"
              />
              {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setComment('');
                    setError(null);
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    isReject
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isPending ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : null}
                  {isReject ? 'Reject' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

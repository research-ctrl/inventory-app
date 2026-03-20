'use client';

import * as Tabs from '@radix-ui/react-tabs';
import { DataTable } from '@/components/shared/data-table';
import { approvalColumns, myApprovalColumns, type ApprovalRow } from './approvals-columns';
import { EmptyState } from '@/components/shared/empty-state';

interface ApprovalsTableProps {
  myApprovals: ApprovalRow[];
  allApprovals: ApprovalRow[];
  role: string;
}

const isAdmin = (role: string) => ['admin', 'super_admin'].includes(role);

export default function ApprovalsTable({
  myApprovals,
  allApprovals,
  role,
}: ApprovalsTableProps) {
  const showAllTab = isAdmin(role);

  return (
    <Tabs.Root defaultValue="mine" className="space-y-4">
      <Tabs.List
        className="flex border-b border-gray-200"
        aria-label="Approval views"
      >
        <Tabs.Trigger
          value="mine"
          className="relative px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 data-[state=active]:text-blue-600 data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-blue-600"
        >
          My Pending
          {myApprovals.length > 0 && (
            <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
              {myApprovals.length}
            </span>
          )}
        </Tabs.Trigger>

        {showAllTab && (
          <Tabs.Trigger
            value="all"
            className="relative px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 data-[state=active]:text-blue-600 data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-blue-600"
          >
            All Pending
            {allApprovals.length > 0 && (
              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                {allApprovals.length}
              </span>
            )}
          </Tabs.Trigger>
        )}
      </Tabs.List>

      <Tabs.Content value="mine" className="outline-none">
        {myApprovals.length === 0 ? (
          <EmptyState
            title="No pending approvals"
            description="You have no items waiting for your decision."
          />
        ) : (
          <DataTable columns={myApprovalColumns} data={myApprovals} />
        )}
      </Tabs.Content>

      {showAllTab && (
        <Tabs.Content value="all" className="outline-none">
          {allApprovals.length === 0 ? (
            <EmptyState
              title="No pending approvals"
              description="There are no pending approvals across the system."
            />
          ) : (
            <DataTable columns={approvalColumns} data={allApprovals} />
          )}
        </Tabs.Content>
      )}
    </Tabs.Root>
  );
}

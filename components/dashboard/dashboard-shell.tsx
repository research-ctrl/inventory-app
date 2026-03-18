export function DashboardShell() {
  const stats = [
    { label: "Open Requirements", value: "—" },
    { label: "Pending Approvals", value: "—" },
    { label: "Active POs", value: "—" },
    { label: "Pending Deliveries", value: "—" },
    { label: "QC Queue", value: "—" },
    { label: "Low Stock Items", value: "—" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Material lifecycle overview</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border bg-card p-4 shadow-sm"
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 font-semibold">Recent Activity</h2>
        <p className="text-sm text-muted-foreground">No recent activity to display.</p>
      </div>
    </div>
  );
}

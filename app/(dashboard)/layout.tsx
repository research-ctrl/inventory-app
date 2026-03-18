import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { requireSession } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession().catch(() => null);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar role={session?.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav user={session?.user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

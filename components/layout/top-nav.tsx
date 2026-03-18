import type { User } from "@supabase/supabase-js";

interface TopNavProps {
  user?: User | null;
}

export function TopNav({ user }: TopNavProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-2">
        {/* Breadcrumbs will go here */}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {user?.email ?? "Guest"}
        </span>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sign Out
          </button>
        </form>
      </div>
    </header>
  );
}

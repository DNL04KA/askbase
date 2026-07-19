import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/org";
import { Sidebar } from "@/components/dashboard/sidebar";
import { UserMenu } from "@/components/dashboard/user-menu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const { user, org } = ctx;

  return (
    <div className="flex min-h-screen">
      <Sidebar orgName={org.name} plan={org.plan} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end border-b border-border/60 px-6">
          <UserMenu
            email={user.email ?? ""}
            fullName={(user.user_metadata?.full_name as string) ?? ""}
          />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

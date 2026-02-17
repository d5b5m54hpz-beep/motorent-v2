import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { DashboardContent } from "@/components/layout/dashboard-content";
import { ChatAssistant } from "@/components/chat-assistant";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");
  if (session.user.role !== "ADMIN" && session.user.role !== "OPERADOR") {
    redirect("/login-admin");
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen">
        <AppSidebar user={session.user} />
        <DashboardContent>{children}</DashboardContent>
      </div>
      <ChatAssistant />
    </SidebarProvider>
  );
}

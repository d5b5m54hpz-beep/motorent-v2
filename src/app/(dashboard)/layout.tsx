import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { Header } from "@/components/layout/header";
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
      <div className="flex min-h-screen">
        <AppSidebar user={session.user} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header user={session.user} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
      <ChatAssistant />
    </SidebarProvider>
  );
}

import type { ReactNode } from "react";
import AdminShell from "@/components/Admin/AdminShell";

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
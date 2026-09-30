import type { ReactNode } from "react";
import { RestaurantHeader } from "@/components/restaurant/RestaurantHeader";
import { RestaurantSidebar } from "@/components/restaurant/RestaurantSidebar";

export default function RestaurantLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen bg-slate-50"><RestaurantSidebar /><div className="flex min-w-0 flex-1 flex-col"><RestaurantHeader /><main className="flex-1 p-5 md:p-8">{children}</main></div></div>;
}

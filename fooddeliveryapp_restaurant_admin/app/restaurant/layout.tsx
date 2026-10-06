import type { ReactNode } from "react";
import { RestaurantPortalShell } from "@/components/restaurant/RestaurantPortalShell";

export default function RestaurantLayout({ children }: { children: ReactNode }) {
  return <RestaurantPortalShell>{children}</RestaurantPortalShell>;
}

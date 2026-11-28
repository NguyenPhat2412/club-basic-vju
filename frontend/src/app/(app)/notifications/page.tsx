import { Suspense } from "react";
import { NotificationsView } from "@/components/notification/NotificationsView";

export default function NotificationsPage() {
  return (
    <Suspense>
      <NotificationsView />
    </Suspense>
  );
}

import { AdminSkeleton } from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-muted/40">
      <div className="border-b bg-white h-14" />
      <AdminSkeleton />
    </div>
  );
}

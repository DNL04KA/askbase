import { Skeleton } from "@/components/ui/skeleton";

export default function ChatbotLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-9 w-80" />
      <Skeleton className="h-[60vh] rounded-xl" />
    </div>
  );
}

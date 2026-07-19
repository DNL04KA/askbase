import Link from "next/link";
import { ArrowLeft, Bot } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-130 w-130 -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
      </div>
      <Link
        href="/"
        className="absolute top-5 left-5 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to home
      </Link>
      <Link
        href="/"
        className="relative mb-8 flex items-center gap-2 text-xl font-semibold tracking-tight"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Bot className="size-5" />
        </span>
        Askbase
      </Link>
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}

import Link from "next/link";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
        <Bot className="size-7" />
      </span>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">404</h1>
      <p className="mt-2 text-muted-foreground">
        This page doesn&apos;t exist — even our chatbot couldn&apos;t find it.
      </p>
      <Button className="mt-6" render={<Link href="/" />}>Back home</Button>
    </div>
  );
}

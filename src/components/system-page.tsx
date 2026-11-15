import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function SystemPageHeading({ title, count, action }: { title: string; count?: number; action?: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><h1 className="font-display text-2xl font-semibold">{title}</h1>{count !== undefined ? <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-sm tabular-nums text-muted-foreground">{count}</span> : null}</div>{action}</div>;
}

export function SystemEditor({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return <Sheet open={open} onOpenChange={value => { if (!value) onClose(); }}><SheetContent className="system-editor flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl" aria-describedby={undefined}><SheetHeader className="border-b border-border p-6 text-left"><SheetTitle>{title}</SheetTitle></SheetHeader><div className="min-w-0 flex-1 p-6">{children}</div></SheetContent></Sheet>;
}
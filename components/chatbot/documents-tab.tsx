"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ClipboardPaste,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DocumentRow {
  id: string;
  title: string;
  source_type: string;
  status: "pending" | "processing" | "processed" | "failed";
  error_message: string | null;
  chunk_count: number;
  created_at: string;
}

const STATUS_STYLES: Record<DocumentRow["status"], string> = {
  pending: "bg-secondary text-secondary-foreground",
  processing: "bg-blue-500/15 text-blue-300",
  processed: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-red-500/15 text-red-300",
};

export function DocumentsTab({
  chatbotId,
  documentLimit,
  planName,
}: {
  chatbotId: string;
  documentLimit: number;
  planName: string;
}) {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    const res = await fetch(`/api/chatbots/${chatbotId}/documents`);
    if (res.ok) {
      const data = await res.json();
      setDocuments(data.documents ?? []);
    }
    setLoading(false);
  }, [chatbotId]);

  useEffect(() => {
    // initial fetch-on-mount; loadDocuments only sets state after awaits
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocuments();
  }, [loadDocuments]);

  const processDocument = useCallback(
    async (docId: string) => {
      setProcessingIds((prev) => new Set(prev).add(docId));
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: "processing" } : d))
      );
      try {
        const res = await fetch(`/api/documents/${docId}/process`, {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Processing failed");
        toast.success(
          `Processed "${data.document.title}" — ${data.document.chunk_count} chunks`
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Processing failed"
        );
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(docId);
          return next;
        });
        loadDocuments();
      }
    },
    [loadDocuments]
  );

  async function uploadFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      setUploading(true);
      try {
        const form = new FormData();
        form.append("chatbot_id", chatbotId);
        form.append("file", file);
        const res = await fetch("/api/documents/upload", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        toast.success(`Uploaded "${file.name}"`);
        await loadDocuments();
        // Kick off processing right away
        processDocument(data.document.id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    }
  }

  async function submitPastedText(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    try {
      const form = new FormData();
      form.append("chatbot_id", chatbotId);
      form.append("title", pasteTitle);
      form.append("text", pasteText);
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      toast.success("Text added");
      setPasteOpen(false);
      setPasteTitle("");
      setPasteText("");
      await loadDocuments();
      processDocument(data.document.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function deleteDocument(doc: DocumentRow) {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Document deleted");
      loadDocuments();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to delete");
    }
  }

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary/8"
            : "border-border/70 bg-card/40"
        )}
      >
        <UploadCloud className="size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">
          Drag & drop files here, or{" "}
          <button
            className="text-primary hover:underline"
            onClick={() => fileInputRef.current?.click()}
          >
            browse
          </button>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF, TXT, MD, DOCX — up to 10 MB · {documents.length}/{documentLimit}{" "}
          documents on the {planName} plan
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.docx"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="mt-4">
          <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" size="sm">
                  <ClipboardPaste className="size-4" />
                  Paste text
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add text content</DialogTitle>
              </DialogHeader>
              <form onSubmit={submitPastedText} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paste-title">Title</Label>
                  <Input
                    id="paste-title"
                    placeholder="FAQ, Product overview…"
                    value={pasteTitle}
                    onChange={(e) => setPasteTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paste-text">Content</Label>
                  <Textarea
                    id="paste-text"
                    rows={10}
                    placeholder="Paste your knowledge base content here…"
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={uploading}>
                  {uploading && <Loader2 className="size-4 animate-spin" />}
                  Add to knowledge base
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Uploading…
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card/40 p-8 text-center">
          <FileText className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No documents yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your first document — the bot will answer questions based on
            it.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Chunks</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => {
                const isProcessing =
                  processingIds.has(doc.id) || doc.status === "processing";
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="max-w-60">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium">
                          {doc.title}
                        </span>
                      </div>
                      {doc.status === "failed" && doc.error_message && (
                        <p className="mt-1 truncate text-xs text-red-400">
                          {doc.error_message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn("border-0", STATUS_STYLES[doc.status])}
                      >
                        {isProcessing && (
                          <Loader2 className="size-3 animate-spin" />
                        )}
                        {isProcessing ? "processing" : doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.status === "processed" ? doc.chunk_count : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {(doc.status === "failed" ||
                          doc.status === "pending") &&
                          !isProcessing && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => processDocument(doc.id)}
                              aria-label="Reprocess document"
                            >
                              <RefreshCw className="size-4" />
                            </Button>
                          )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteDocument(doc)}
                          aria-label="Delete document"
                          className="text-muted-foreground hover:text-red-400"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

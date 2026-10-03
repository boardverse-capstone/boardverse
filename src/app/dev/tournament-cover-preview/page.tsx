"use client";

import * as React from "react";
import { TournamentCoverUpload } from "@/features/cafe-tournament/components/tournament-cover-upload";
import { toast } from "sonner";

/**
 * Dev-only harness for the tournament cover image uploader. Accepts an
 * optional `?initial=…` query so we can cover all three lifecycle states
 * (empty / with URL / after upload) without rebuilding the parent form.
 *
 * The real TournamentCreateModal drives `imageUrl` via useState, but
 * here we just log onUploaded/onCleared to the screen so Playwright can
 * assert via DOM.
 */
export default function TournamentCoverPreviewPage() {
  const [url, setUrl] = React.useState<string>("");
  const [disabled, setDisabled] = React.useState(false);

  // Read `?initial=…` once on mount to seed the preview.
  const initialUrl = React.useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const value = new URLSearchParams(window.location.search).get("initial");
    return value ?? undefined;
  }, []);

  return (
    <main className="min-h-screen bg-neutral-100 p-8 flex flex-col items-center gap-6">
      <header className="max-w-xl w-full">
        <h1 className="text-lg font-black text-neutral-900">
          TournamentCoverUpload — Playwright preview
        </h1>
        <p className="text-xs text-neutral-600">
          Dev-only harness. URL Cloudinary hiện tại hiển thị bên dưới để
          kiểm tra callback onUploaded / onCleared.
        </p>
      </header>

      <div className="max-w-xl w-full bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col gap-3">
        <TournamentCoverUpload
          initialUrl={initialUrl}
          disabled={disabled}
          onUploaded={(uploaded) => {
            setUrl(uploaded);
            toast.success("Đã upload ảnh bìa.");
          }}
          onCleared={() => {
            setUrl("");
            toast.info("Đã gỡ ảnh bìa.");
          }}
        />

        <div className="border-t border-neutral-200 pt-3 text-[11px] font-mono text-neutral-700 break-all">
          <strong className="text-neutral-500">secure_url hiện tại:</strong>{" "}
          {url || <em className="text-neutral-400">(rỗng)</em>}
        </div>

        <label className="flex items-center gap-2 text-[11px] font-bold text-neutral-700">
          <input
            type="checkbox"
            checked={disabled}
            onChange={(e) => setDisabled(e.target.checked)}
            className="w-3.5 h-3.5"
          />
          Disabled (để test state khi form đang submit)
        </label>
      </div>
    </main>
  );
}

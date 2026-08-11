'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { IconExternalLink, IconFileText, IconPhoto } from '@tabler/icons-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface RegistrationImageGalleryProps {
  title: string;
  images: string[];
  seed: string;
  className?: string;
}

function resolveDisplayUrl(src: string, seed: string, index: number): string {
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  return `https://picsum.photos/seed/${seed}-${index}/640/480`;
}

function isPdfUrl(url: string): boolean {
  try {
    const pathname = new URL(url, 'https://placeholder.local').pathname.toLowerCase();
    return pathname.endsWith('.pdf');
  } catch {
    return url.toLowerCase().includes('.pdf');
  }
}

const LABELS = ['Mặt tiền', 'Khu vực bàn chơi', 'Hệ thống ánh sáng', 'Không gian', 'Chi tiết'];

export function RegistrationImageGallery({
  title,
  images,
  seed,
  className,
}: RegistrationImageGalleryProps) {
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    label: string;
  } | null>(null);

  if (!images.length) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/40 px-4 py-8 text-sm text-muted-foreground">
        <IconPhoto className="size-5 shrink-0" />
        Chưa có hình ảnh đính kèm
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((src, index) => {
          const displayUrl = resolveDisplayUrl(src, seed, index);
          const label = LABELS[index] ?? `Ảnh ${index + 1}`;

          if (isPdfUrl(displayUrl)) {
            return (
              <figure
                key={`${seed}-${index}`}
                className="overflow-hidden rounded-xl border bg-card shadow-sm"
              >
                <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 bg-muted/50 p-6">
                  <IconFileText className="size-10 text-amber-600" />
                  <p className="text-center text-sm font-medium">{label}</p>
                  <Link
                    href={displayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    Xem tài liệu PDF
                    <IconExternalLink className="size-4" />
                  </Link>
                </div>
              </figure>
            );
          }

          return (
            <figure
              key={`${seed}-${index}`}
              className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <button
                type="button"
                className="block w-full text-left"
                onClick={() => setPreviewImage({ src: displayUrl, label })}
              >
                <div className="relative aspect-[4/3] bg-muted">
                  <Image
                    src={displayUrl}
                    alt={`${title} - ${label}`}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized
                  />
                </div>
              </button>
              <figcaption className="border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                {label}
              </figcaption>
            </figure>
          );
        })}
      </div>

      <Dialog
        open={Boolean(previewImage)}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null);
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {title}
              {previewImage ? ` - ${previewImage.label}` : ''}
            </DialogTitle>
          </DialogHeader>

          {previewImage ? (
            <div className="relative max-h-[75vh] overflow-auto rounded-lg bg-muted/30">
              <div className="relative mx-auto min-h-[320px] w-full">
                <Image
                  src={previewImage.src}
                  alt={`${title} - ${previewImage.label}`}
                  width={1600}
                  height={1200}
                  className="h-auto max-w-full rounded-lg object-contain"
                  unoptimized
                />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

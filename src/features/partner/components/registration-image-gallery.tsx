'use client';

import Image from 'next/image';
import { IconPhoto } from '@tabler/icons-react';
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

const LABELS = ['Mặt tiền', 'Khu vực bàn chơi', 'Hệ thống ánh sáng', 'Không gian', 'Chi tiết'];

export function RegistrationImageGallery({
  title,
  images,
  seed,
  className,
}: RegistrationImageGalleryProps) {
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

          return (
            <figure
              key={`${seed}-${index}`}
              className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
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
              <figcaption className="border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                {label}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}

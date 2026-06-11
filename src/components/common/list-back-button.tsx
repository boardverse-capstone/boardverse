'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { IconArrowLeft } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { useListBackUrl } from '@/shared/hooks/useListBackUrl';

interface ListBackButtonProps {
  fallbackPath: string;
  allowedPrefixes?: string[];
  label?: string;
}

function ListBackButtonInner({
  fallbackPath,
  allowedPrefixes,
  label = 'Quay lại danh sách',
}: ListBackButtonProps) {
  const backUrl = useListBackUrl(fallbackPath, allowedPrefixes);

  return (
    <Button variant="ghost" asChild className="px-0">
      <Link href={backUrl}>
        <IconArrowLeft className="mr-2 h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}

export function ListBackButton(props: ListBackButtonProps) {
  return (
    <Suspense fallback={<div className="h-9 w-40 animate-pulse rounded-md bg-muted" />}>
      <ListBackButtonInner {...props} />
    </Suspense>
  );
}

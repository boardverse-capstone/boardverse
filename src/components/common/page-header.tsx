interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="relative space-y-1 overflow-hidden rounded-lg border-2 border-orange-400 bg-gradient-to-br from-orange-100 via-orange-50 to-amber-100 px-4 py-3 shadow-[3px_3px_0_rgba(234,88,12,0.3)]">
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.05)_3px,rgba(255,255,255,0.05)_4px)]" />
      <span className="pointer-events-none absolute right-3 top-3 size-2 animate-pulse rounded-full bg-amber-500 shadow-[0_0_8px_currentColor]" />
      <h1 className="font-mono text-xl font-extrabold uppercase tracking-widest text-orange-900 [text-shadow:1px_1px_0_rgba(255,255,255,0.6)] sm:text-2xl">
        <span className="mr-2 inline-block size-2 align-middle animate-pulse rounded-full bg-orange-600 shadow-[0_0_6px_currentColor]" />
        ► {title}
      </h1>
      {description && (
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-orange-700 sm:text-sm">
          ▸ {description}
        </p>
      )}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="relative space-y-1 overflow-hidden rounded-lg border-2 border-violet-400 bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100 px-4 py-3 shadow-[3px_3px_0_rgba(139,92,246,0.3)]">
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.05)_3px,rgba(255,255,255,0.05)_4px)]" />
      <span className="pointer-events-none absolute right-3 top-3 size-2 animate-pulse rounded-full bg-fuchsia-500 shadow-[0_0_8px_currentColor]" />
      <h1 className="font-mono text-xl font-extrabold uppercase tracking-widest text-violet-900 [text-shadow:1px_1px_0_rgba(255,255,255,0.6)] sm:text-2xl">
        <span className="mr-2 inline-block size-2 align-middle animate-pulse rounded-full bg-violet-600 shadow-[0_0_6px_currentColor]" />
        ► {title}
      </h1>
      {description && (
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-violet-700 sm:text-sm">
          ▸ {description}
        </p>
      )}
    </div>
  );
}

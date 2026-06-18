interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
      {description && (
        <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
      )}
    </div>
  );
}

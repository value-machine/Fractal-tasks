import { Archive, ClipboardList, type LucideIcon } from "lucide-react";

type EmptyVariant = "active" | "archive";

const COPY: Record<EmptyVariant, { icon: LucideIcon; title: string; hint: string }> = {
  active: {
    icon: ClipboardList,
    title: "No active tasks",
    hint: "Add a task to start tracking dev work in this repo.",
  },
  archive: {
    icon: Archive,
    title: "No archived tasks",
    hint: "Completed tasks appear here when you mark them done.",
  },
};

interface TasksListEmptyStateProps {
  variant: EmptyVariant;
}

export const TasksListEmptyState = ({ variant }: TasksListEmptyStateProps) => {
  const { icon: Icon, title, hint } = COPY[variant];

  return (
    <div className="rounded-lg border border-dashed bg-accent/50 px-4 py-12 text-center">
      <Icon className="mx-auto mb-2 size-10 text-muted-foreground/60" />
      <p className="mb-1 text-muted-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
};

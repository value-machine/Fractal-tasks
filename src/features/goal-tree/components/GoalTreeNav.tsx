import { useState, type FormEvent, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Input } from "@/components/common/Input";
import { cn } from "@/shared/utils/cn";

const NAV_ITEMS = [
  { to: "/", label: "Tree", end: true },
  { to: "/views/donor", label: "Thinking work", end: false },
  { to: "/views/executor", label: "Actions", end: false },
] as const;

const navLinkClassName = ({ isActive }: { isActive: boolean }): string =>
  cn(
    "rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap no-underline transition-colors",
    isActive
      ? "bg-foreground text-background"
      : "text-muted-foreground hover:bg-accent hover:text-foreground"
  );

/** View switcher (tree / thinking work / actions) with a search box that goes to /search?q=. */
export const GoalTreeNav = ({ initialQuery = "" }: { initialQuery?: string }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmed = query.trim();
    void navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/");
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <nav aria-label="Views" className="flex gap-1 overflow-x-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClassName}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <form role="search" onSubmit={handleSubmit} className="w-full sm:ml-auto sm:w-64">
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tasks"
          aria-label="Search tasks"
          autoComplete="off"
        />
      </form>
    </div>
  );
};

/** Page frame for every goal-tree page: nav on top, scrollable content below. */
export const GoalTreeShell = ({
  children,
  initialQuery,
}: {
  children: ReactNode;
  initialQuery?: string;
}) => (
  <div className="flex min-h-0 flex-1 flex-col">
    <GoalTreeNav initialQuery={initialQuery} />
    <div className="min-h-0 flex-1 overflow-y-auto pt-2 pb-8">{children}</div>
  </div>
);

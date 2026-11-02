import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import type { AppTask } from "@/features/tasks/types/appTask.types";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/Select";
import { Textarea } from "@/components/common/Textarea";
import { cn } from "@/shared/utils/cn";
import {
  TASK_STATUS_LABEL,
  TASK_STATUS_OPTIONS,
  TASK_STATUS_SELECT_MIN_WIDTH,
  TASK_STATUS_TEXT_CLASS,
} from "./taskStatusUi";

/** Grid: drag handle | status | title (wraps below on xs) | delete. `--status-w` set inline. */
const ROW_CLASS_NAME =
  "group grid grid-cols-[28px_var(--status-w)_auto] grid-rows-[auto_auto] items-start gap-2 rounded-lg border bg-card p-2.5 transition-[box-shadow,opacity] duration-(--duration-fast) hover:elevation-md sm:grid-cols-[32px_var(--status-w)_minmax(0,1fr)_40px] sm:grid-rows-1 sm:gap-3 sm:p-3";

type FocusedField = "title" | "description" | null;

interface ActiveTaskRowProps {
  task: AppTask;
  index: number;
  onTextChange: (patch: Partial<Pick<AppTask, "title" | "description">>) => void;
  onFlush: (patch: Partial<Pick<AppTask, "title" | "description">>) => void;
  onStatusChange: (status: AppTask["status"]) => void;
  onDelete: () => void;
}

export const ActiveTaskRow = ({
  task,
  index,
  onTextChange,
  onFlush,
  onStatusChange,
  onDelete,
}: ActiveTaskRowProps) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [descriptionDraft, setDescriptionDraft] = useState(task.description);

  useEffect(() => {
    if (focusedField !== "title") {
      setTitleDraft(task.title);
    }
  }, [task.title, focusedField]);

  useEffect(() => {
    if (focusedField !== "description") {
      setDescriptionDraft(task.description);
    }
  }, [task.description, focusedField]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `active-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const commitRow = () => {
    setExpanded(false);
    setEditingTitle(false);
    setFocusedField(null);
    void onFlush({ title: titleDraft, description: descriptionDraft });
  };

  const handleRowBlur = (event: React.FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    if (next && rowRef.current?.contains(next)) {
      return;
    }
    commitRow();
  };

  const handleStatus = (value: string) => {
    onStatusChange(value as AppTask["status"]);
  };

  return (
    <div
      ref={(node: HTMLDivElement | null) => {
        setNodeRef(node);
        rowRef.current = node;
      }}
      style={{ ...style, "--status-w": TASK_STATUS_SELECT_MIN_WIDTH } as React.CSSProperties}
      onBlur={handleRowBlur}
      className={cn(ROW_CLASS_NAME, isDragging && "opacity-75 elevation-xl")}
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label="Drag to reorder"
        className="col-start-1 row-start-1 mt-0.5 size-7 cursor-grab text-muted-foreground/60 hover:bg-accent"
        {...attributes}
        {...listeners}
      >
        <GripVertical />
      </Button>

      <Select value={task.status} onValueChange={handleStatus}>
        <SelectTrigger
          hideIcon
          aria-label="Task status"
          className={cn(
            "col-start-2 row-start-1 w-(--status-w)",
            TASK_STATUS_TEXT_CLASS[task.status]
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TASK_STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status} className={TASK_STATUS_TEXT_CLASS[status]}>
              {TASK_STATUS_LABEL[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="col-span-full row-start-2 min-w-0 sm:col-span-1 sm:col-start-3 sm:row-start-1">
        {editingTitle ? (
          <Input
            autoFocus
            className="h-9"
            value={titleDraft}
            onChange={(e) => {
              setTitleDraft(e.target.value);
              onTextChange({ title: e.target.value });
            }}
            onFocus={() => setFocusedField("title")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitRow();
              }
            }}
          />
        ) : (
          <p
            onClick={() => setExpanded((v) => !v)}
            onDoubleClick={() => {
              setTitleDraft(task.title);
              setEditingTitle(true);
            }}
            className="cursor-pointer pt-1.5 leading-snug font-medium break-words"
          >
            {task.title}
          </p>
        )}

        {expanded && !editingTitle && (
          <Textarea
            rows={2}
            className="mt-2"
            placeholder="Description"
            value={descriptionDraft}
            onChange={(e) => {
              setDescriptionDraft(e.target.value);
              onTextChange({ description: e.target.value });
            }}
            onFocus={() => {
              setFocusedField("description");
              setExpanded(true);
            }}
          />
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete task"
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onClick={() => {
          if (window.confirm(`Delete "${task.title}" from the active backlog?`)) {
            onDelete();
          }
        }}
        className="col-start-3 row-start-1 justify-self-center text-destructive transition-opacity hover:bg-destructive/10 sm:col-start-4 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
      >
        <Trash2 />
      </Button>
    </div>
  );
};

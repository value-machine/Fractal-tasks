import { useAppTasksBacklog } from "@/features/tasks/hooks/useAppTasksBacklog";
import { ActiveTaskList } from "./ActiveTaskList";
import { ArchiveTaskList } from "./ArchiveTaskList";
import { TasksAutosaveIndicator } from "./TasksAutosaveIndicator";
import { TasksFeedback } from "./TasksFeedback";
import { Plus } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Tabs, TabsList, TabsTrigger } from "@/components/common/Tabs";

export const TasksBacklogPanel = () => {
  const {
    view,
    activeTasks,
    archiveTasks,
    feedback,
    textAutosaveStatus,
    errorMessage,
    changeView,
    updateRowText,
    flushRowText,
    setStatusAt,
    reorderActive,
    deleteActiveAt,
    addTask,
    restoreAt,
    clearFeedback,
  } = useAppTasksBacklog(true);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TasksFeedback
        feedback={feedback}
        errorMessage={errorMessage}
        onDismiss={() => clearFeedback()}
      />

      <div className="flex shrink-0 flex-col items-stretch justify-between gap-2 px-3 pt-2 sm:flex-row sm:items-center sm:px-4">
        <Tabs
          value={view}
          onValueChange={(next) => {
            void changeView(next === "active" ? "active" : "archive");
          }}
        >
          <TabsList>
            <TabsTrigger value="active">{`Active (${activeTasks.length})`}</TabsTrigger>
            <TabsTrigger value="archive">{`Archive (${archiveTasks.length})`}</TabsTrigger>
          </TabsList>
        </Tabs>

        {view === "active" && (
          <div className="flex items-center gap-2 pb-1 sm:pb-0">
            <TasksAutosaveIndicator status={textAutosaveStatus} />
            <Button size="sm" onClick={() => void addTask()}>
              <Plus />
              Add task
            </Button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-4">
        {view === "active" ? (
          <ActiveTaskList
            tasks={activeTasks}
            onTextChange={updateRowText}
            onFlush={flushRowText}
            onStatusChange={(index, status) => void setStatusAt(index, status)}
            onReorder={(from, to) => void reorderActive(from, to)}
            onDelete={(index) => void deleteActiveAt(index)}
          />
        ) : (
          <ArchiveTaskList tasks={archiveTasks} onRestore={restoreAt} />
        )}
      </div>
    </div>
  );
};

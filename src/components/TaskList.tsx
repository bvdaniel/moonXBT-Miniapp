import Image from "next/image";
import { Info, CheckCircle2 } from "lucide-react";
import { Task } from "@/hooks/useAirdropTasks";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TaskListProps {
  title: string;
  tasks: Task[];
  renderTaskButton: (task: Task) => JSX.Element;
}

export default function TaskList({
  title,
  tasks,
  renderTaskButton,
}: TaskListProps) {
  return (
    <div>
      <div className="relative flex items-center justify-between">
        <h2 className="text-sm sm:text-base font-bold mb-1 text-white border-b border-white/30 pb-1 tracking-widest">
          {title}
        </h2>
        {title.toLowerCase().includes("required") && (
          <Image
            src="/moon_mini.png"
            alt="Moon"
            className="w-12 h-12 animate-bob pointer-events-none neon-moon"
            width={48}
            height={48}
            style={{ marginBottom: "-12px" }}
          />
        )}
      </div>
      <div className="space-y-1">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="terminal-border bg-[#1752F0]/80 p-1.5 sm:p-2 flex flex-col sm:flex-row items-start sm:items-center justify-between w-full mb-0.5 gap-2"
          >
            <div className="flex items-center space-x-3">
              {task.isCompleted ? (
                <span className="text-green-300 flex-1 min-w-max">[✓]</span>
              ) : (
                <span className="text-white flex-1 min-w-max">[ ]</span>
              )}
              <div>
                <div className="text-blue-100 font-bold flex items-center text-xs sm:text-sm justify-start gap-2 w-full">
                  {task.icon}
                  <span className="w-fit">{task.title}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 ml-1 text-blue-300 cursor-help hover:text-blue-200" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-900 border border-gray-700">
                        <p className="text-white text-xs">
                          {task.pointsDescription ||
                            `${task.points} points for completing this task`}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="text-[11px] text-blue-50 break-words max-w-full">
                  {task.description}
                </div>
              </div>
            </div>
            <div className="w-full sm:w-auto mt-1 sm:mt-0 flex justify-end">
              {renderTaskButton(task)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

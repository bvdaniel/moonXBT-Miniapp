interface ProgressPanelProps {
  completedRequiredTasks: number;
  requiredTotal: number;
  completedOptionalTasks: number;
  optionalTotal: number;
}

export default function ProgressPanel({
  completedRequiredTasks,
  requiredTotal,
  completedOptionalTasks,
  optionalTotal,
}: ProgressPanelProps) {
  return (
    <div className="terminal-border bg-[#1752F0]/80 p-1.5 sm:p-3 text-center mt-2 w-full">
      <pre className="text-white text-xs mb-2 select-none">
        {`[${"=".repeat(completedRequiredTasks)}${" ".repeat(
          Math.max(0, requiredTotal - completedRequiredTasks)
        )}] ${completedRequiredTasks}/${requiredTotal} Required`}
        {`\n[${"=".repeat(completedOptionalTasks)}${" ".repeat(
          Math.max(0, optionalTotal - completedOptionalTasks)
        )}] ${completedOptionalTasks}/${optionalTotal} Bonus`}
      </pre>
      <span className="bios-cursor" />
    </div>
  );
}

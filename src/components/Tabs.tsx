import { FaTasks } from "react-icons/fa";

interface TabsProps {
  active: "tasks" | "leaderboard";
  onChange: (tab: "tasks" | "leaderboard") => void;
}

export default function Tabs({ active, onChange }: TabsProps) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex overflow-hidden border-2 border-white">
        <button
          className={`px-6 py-2 font-bold text-sm tracking-widest select-none ${
            active === "tasks"
              ? "bg-[#1752F0] text-white"
              : "bg-[#1a2b6b] text-blue-200 hover:bg-[#223a8c]"
          } border-r-2 border-white`}
          style={{ letterSpacing: 2, borderRadius: 0 }}
          onClick={() => onChange("tasks")}
        >
          <FaTasks className="inline-block mr-2 align-middle" />
          TASKS
        </button>
        <button
          className={`px-6 py-2 font-bold text-sm tracking-widest select-none ${
            active === "leaderboard"
              ? "bg-[#1752F0] text-white"
              : "bg-[#1a2b6b] text-blue-200 hover:bg-[#223a8c]"
          }`}
          style={{ letterSpacing: 2, borderRadius: 0 }}
          onClick={() => onChange("leaderboard")}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="inline-block mr-2 align-middle"
          >
            <rect x="3" y="3" width="18" height="14" rx="2" />
            <path d="M8 21h8" />
            <path d="M12 17v4" />
          </svg>
          LEADERBOARD
        </button>
      </div>
    </div>
  );
}

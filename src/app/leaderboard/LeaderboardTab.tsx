"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Trophy, Medal } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  username: string;
  points: number;
  avatar: string;
}

export default function LeaderboardTab() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        const response = await fetch('/api/leaderboard');
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data');
        }
        const data = await response.json();
        setLeaderboardData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboardData();
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-white" style={{ fontFamily: 'Press Start 2P, monospace' }}>{rank}</span>;
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <h2 className="text-sm sm:text-base font-bold mb-1 text-white border-b border-white/30 pb-1 tracking-widest text-center" style={{ fontFamily: 'Press Start 2P, monospace', letterSpacing: 2 }}>
          LEADERBOARD
        </h2>
      </div>
      {error ? (
        <div className="bg-red-900/50 p-4 rounded-lg text-center">
          <p className="text-red-400">{error}</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboardData.map((entry) => (
            <div
              key={entry.rank}
              className="terminal-border bg-[#1752F0]/80 p-1.5 sm:p-2 flex flex-col sm:flex-row items-start sm:items-center justify-between w-full mb-0.5"
            >
              <div className="flex items-center space-x-3">
                <span className="flex items-center justify-center w-8 h-8">
                  {getRankIcon(entry.rank)}
                </span>
                <div className="w-10 h-10 relative">
                  <Image
                    src={entry.avatar}
                    alt={entry.username}
                    fill
                    className="rounded-full object-cover border-2 border-white"
                  />
                </div>
                <span className="text-blue-100 font-bold flex items-center text-xs sm:text-sm" style={{ fontFamily: 'Press Start 2P, monospace' }}>{entry.username}</span>
              </div>
              <div className="text-xl font-bold text-purple-300" style={{ fontFamily: 'Press Start 2P, monospace' }}>
                {entry.points.toLocaleString()} pts
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 
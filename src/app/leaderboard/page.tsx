"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trophy, Medal } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  username: string;
  points: number;
  avatar: string;
}

export default function LeaderboardPage() {
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
        return <span className="text-lg font-bold">{rank}</span>;
    }
  };

  return (
    <main className="min-h-screen bg-[#1752F0] text-white font-mono relative overflow-hidden">
      {/* Video background */}
      <div className="absolute inset-0 z-0 w-full h-full overflow-hidden pointer-events-none">
        <video
          src="/bg.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-20"
        />
      </div>
      <div className="scanline pointer-events-none absolute inset-0 z-10" />
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-2 sm:px-4 py-4">
        {/* Tab Navigation */}
        <div className="w-full flex justify-center mb-2">
          <div className="inline-flex rounded-t-lg overflow-hidden border-2 border-white">
            <Link href="/" legacyBehavior>
              <a className="px-6 py-2 bg-[#1a2b6b] text-white font-bold text-sm tracking-widest border-r-2 border-white hover:bg-[#223a8c] transition-all duration-150 select-none" style={{ fontFamily: 'Press Start 2P, monospace', letterSpacing: 2 }}>AIRDROP</a>
            </Link>
            <span className="px-6 py-2 bg-[#1752F0] text-white font-bold text-sm tracking-widest select-none" style={{ fontFamily: 'Press Start 2P, monospace', letterSpacing: 2 }}>LEADERBOARD</span>
          </div>
        </div>
        {/* Leaderboard Terminal Panel */}
        <div className="terminal-border bg-[#1752F0]/80 p-4 sm:p-8 w-full max-w-2xl mx-auto mt-4">
          <h1 className="text-lg sm:text-2xl font-bold mb-6 text-center tracking-widest" style={{ fontFamily: 'Press Start 2P, monospace', letterSpacing: 2 }}>LEADERBOARD</h1>
          {error ? (
            <div className="bg-red-900/50 p-4 rounded-lg text-center">
              <p className="text-red-400">{error}</p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboardData.map((entry) => (
                <div
                  key={entry.rank}
                  className="flex items-center justify-between bg-[#1a2b6b] border-2 border-white px-4 py-3 rounded-lg shadow-md hover:bg-[#223a8c] transition-colors"
                  style={{ fontFamily: 'Press Start 2P, monospace', letterSpacing: 1 }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 flex items-center justify-center">
                      {getRankIcon(entry.rank)}
                    </div>
                    <div className="w-10 h-10 relative">
                      <Image
                        src={entry.avatar}
                        alt={entry.username}
                        fill
                        className="rounded-full object-cover border-2 border-white"
                      />
                    </div>
                    <div className="text-xs sm:text-base font-bold text-blue-100" style={{ fontFamily: 'Press Start 2P, monospace' }}>{entry.username}</div>
                  </div>
                  <div className="text-xs sm:text-lg font-bold text-purple-300" style={{ fontFamily: 'Press Start 2P, monospace' }}>
                    {entry.points.toLocaleString()} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style jsx global>{`
        .terminal-border {
          border: 2px solid #fff;
          border-radius: 0;
          box-shadow: 0 0 0 2px #1752F0, 0 0 8px #fff2;
        }
        .scanline {
          background: repeating-linear-gradient(
            to bottom,
            rgba(255,255,255,0.04) 0px,
            rgba(255,255,255,0.04) 1px,
            transparent 1px,
            transparent 4px
          );
        }
      `}</style>
    </main>
  );
} 
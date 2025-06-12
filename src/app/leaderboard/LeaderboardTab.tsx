"use client";
import { useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import Image from "next/image";
import { Trophy, Medal, ChevronLeft, ChevronRight } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  username: string;
  points: number;
  avatar: string;
  id: string;
  farcasterFid: number;
  completedTasks: number;
  totalTasks: number;
  a0xPoints: number;
  referralPoints: number;
  otherTasksPoints: number;
  tasks: {
    twitter: boolean;
    farcaster: boolean;
    holdA0x: {
      completed: boolean;
      balance: number;
      points: number;
    };
    telegram: boolean;
    tiktok: boolean;
    instagram: boolean;
    zora: boolean;
  };
  linkedUsernames: {
    twitter?: string;
    telegram?: string;
    tiktok?: string;
    instagram?: string;
    zora?: string;
  };
}

export default function LeaderboardTab({
  isInMiniApp,
}: {
  isInMiniApp: boolean | null;
}) {
  const [allLeaderboardData, setAllLeaderboardData] = useState<
    LeaderboardEntry[]
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboardData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/leaderboard`);
      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard data");
      }
      const result = await response.json();

      if (!Array.isArray(result.data)) {
        console.error("Invalid data format received:", result);
        throw new Error("Invalid data format received from server");
      }

      setAllLeaderboardData(result.data);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setAllLeaderboardData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  // Calcular datos de paginación
  const totalPages = Math.ceil(allLeaderboardData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageData = allLeaderboardData.slice(startIndex, endIndex);

  const handleProfileClick = async (farcasterFid: number, username: string) => {
    try {
      if (isInMiniApp) {
        await sdk.actions.viewProfile({
          fid: farcasterFid,
        });
      } else {
        window.open(`https://warpcast.com/${username}`, "_blank");
      }
    } catch (err) {
      console.error("Error opening profile:", err);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return (
          <span
            className="text-base font-bold text-white"
            style={{ fontFamily: "Press Start 2P, monospace" }}
          >
            {rank}
          </span>
        );
    }
  };

  // Validación adicional antes de renderizar
  if (!Array.isArray(allLeaderboardData)) {
    console.error("leaderboardData is not an array:", allLeaderboardData);
    return (
      <div className="w-full px-2">
        <div className="bg-[#1752F0]/20 p-3 rounded-lg text-center">
          <p className="text-blue-100 text-sm">Loading leaderboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-2">
      <div className="mb-3">
        <h2
          className="text-sm font-bold mb-1 text-white border-b border-white/30 pb-1 tracking-widest text-center"
          style={{ fontFamily: "Press Start 2P, monospace", letterSpacing: 2 }}
        >
          LEADERBOARD
        </h2>
      </div>
      {error ? (
        <div className="bg-red-900/50 p-3 rounded-lg text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {currentPageData.map((entry) => (
              <div
                key={entry.rank}
                className="terminal-border bg-[#1752F0]/80 p-3 flex items-center justify-between w-full"
              >
                <div className="flex items-center space-x-3">
                  <span className="flex items-center justify-center w-7 h-7">
                    {getRankIcon(entry.rank)}
                  </span>
                  <div
                    className="w-9 h-9 relative cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() =>
                      handleProfileClick(entry.farcasterFid, entry.username)
                    }
                  >
                    <Image
                      src={entry.avatar}
                      alt={entry.username}
                      fill
                      className="rounded-full object-cover border border-white"
                    />
                  </div>
                  <span
                    className="text-blue-100 font-bold text-xs cursor-pointer hover:text-blue-300 transition-colors truncate max-w-[130px]"
                    style={{ fontFamily: "Press Start 2P, monospace" }}
                    onClick={() =>
                      handleProfileClick(entry.farcasterFid, entry.username)
                    }
                  >
                    {entry.username}
                  </span>
                </div>
                <div
                  className="text-sm font-bold text-purple-300 ml-2"
                  style={{ fontFamily: "Press Start 2P, monospace" }}
                >
                  {entry.points.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center items-center space-x-2 mt-3">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              className="p-1.5 rounded-full bg-[#1752F0]/50 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1752F0]/70 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white text-xs">
              {currentPage}/{totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
              className="p-1.5 rounded-full bg-[#1752F0]/50 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1752F0]/70 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

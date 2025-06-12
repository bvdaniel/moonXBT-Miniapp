import axios from "axios";
import { NextResponse } from "next/server";

const A0X_AGENT_API_URL = process.env.A0X_AGENT_API_URL || "";

interface LeaderboardEntry {
  username: string;
  points: number;
  a0xPoints: number;
  otherTasksPoints: number;
  referralPoints: number;
  pfpUrl: string;
  completedTasks: number;
  totalTasks: number;
  walletAddress: string;
  farcasterFid: number;
  linkedUsernames: {
    twitter?: string;
    telegram?: string;
    tiktok?: string;
    instagram?: string;
    zora?: string;
  };
  referrals: {
    total: number;
    unique: number;
    points: number;
  };
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
  metadata: {
    firstSeen?: string;
    lastUpdated?: string;
  };
}

export async function GET(request: Request) {
  try {
    // Obtener los datos del leaderboard desde la API de A0X
    const response = await axios.get(
      `${A0X_AGENT_API_URL}/moonxbt/airdrop/leaderboard`
    );

    if (response.status !== 200) {
      throw new Error("Error al obtener datos del leaderboard");
    }

    // Validar la estructura de la respuesta
    if (
      !response.data ||
      !response.data.data ||
      !Array.isArray(response.data.data)
    ) {
      console.error("Invalid response format:", response.data);
      throw new Error("Invalid response format from server");
    }

    // Transformar los datos al formato esperado por el frontend
    const transformedData = response.data.data.map(
      (entry: LeaderboardEntry, index: number) => ({
        rank: index + 1,
        username: entry.username,
        points: entry.points,
        avatar: entry.pfpUrl,
        farcasterFid: entry.farcasterFid,
        id: entry.walletAddress,
        completedTasks: entry.completedTasks,
        totalTasks: entry.totalTasks,
        a0xPoints: entry.a0xPoints,
        referralPoints: entry.referralPoints,
        otherTasksPoints: entry.otherTasksPoints,
        tasks: entry.tasks,
        linkedUsernames: entry.linkedUsernames,
        referrals: entry.referrals,
        metadata: entry.metadata,
      })
    );

    return NextResponse.json({
      data: transformedData,
    });
  } catch (error) {
    console.error("Error al obtener el leaderboard:", error);
    return NextResponse.json(
      {
        error: "Error al obtener datos del leaderboard",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

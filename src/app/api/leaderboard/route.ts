import { NextResponse } from "next/server";
import axios from "axios";

const A0X_AGENT_API_URL = process.env.A0X_AGENT_API_URL || "";

interface LeaderboardEntry {
  username: string;
  points?: number;
  pfpUrl?: string;
}

export async function GET() {
  try {
    // Obtener los datos del leaderboard desde la API de A0X
    const response = await axios.get(
      `${A0X_AGENT_API_URL}/a0x-framework/airdrop/leaderboard`
    );

    if (response.status !== 200) {
      throw new Error("Error al obtener datos del leaderboard");
    }

    // Transformar los datos al formato esperado por el frontend
    const leaderboardData = response.data.map(
      (entry: LeaderboardEntry, index: number) => ({
        rank: index + 1,
        username: entry.username,
        points: entry.points || 0,
        avatar: entry.pfpUrl || "https://i.ibb.co/QvFx17r6/logo.png",
      })
    );

    return NextResponse.json(leaderboardData);
  } catch (error) {
    console.error("Error al obtener el leaderboard:", error);
    return NextResponse.json(
      { error: "Error al obtener datos del leaderboard" },
      { status: 500 }
    );
  }
}

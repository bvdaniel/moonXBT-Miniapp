import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: Replace with actual database query
  const mockLeaderboardData = [
    {
      rank: 1,
      username: "user1",
      points: 5000,
      avatar: "https://i.ibb.co/QvFx17r6/logo.png"
    },
    {
      rank: 2,
      username: "user2",
      points: 4500,
      avatar: "https://i.ibb.co/QvFx17r6/logo.png"
    },
    {
      rank: 3,
      username: "user3",
      points: 4000,
      avatar: "https://i.ibb.co/QvFx17r6/logo.png"
    },
    {
      rank: 4,
      username: "user4",
      points: 3500,
      avatar: "https://i.ibb.co/QvFx17r6/logo.png"
    },
    {
      rank: 5,
      username: "user5",
      points: 3000,
      avatar: "https://i.ibb.co/QvFx17r6/logo.png"
    }
  ];

  return NextResponse.json(mockLeaderboardData);
} 
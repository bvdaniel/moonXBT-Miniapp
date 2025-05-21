import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { sendNotification } from '@/lib/notifs';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.fid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationId, title, body, targetUrl } = await req.json();

    if (!notificationId || !title || !body || !targetUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await sendNotification(session.fid, {
      notificationId,
      title,
      body,
      targetUrl,
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to send notification' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getPlayerByPin } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();

    if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be exactly 4 digits" },
        { status: 400 }
      );
    }

    const player = getPlayerByPin(pin);

    if (!player) {
      return NextResponse.json(
        { error: "Invalid PIN" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: player.id,
      name: player.name,
      hasAssignment: player.secret_player_id !== null,
      secretPlayerName: player.secret_player_name,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}

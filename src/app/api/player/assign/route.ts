import { NextResponse } from "next/server";
import { getPlayerByPin, assignSecretSanta } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();

    if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be exactly 4 digits" },
        { status: 400 }
      );
    }

    const player = await getPlayerByPin(pin);

    if (!player) {
      return NextResponse.json(
        { error: "Invalid PIN" },
        { status: 401 }
      );
    }

    const result = await assignSecretSanta(player.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      id: player.id,
      name: player.name,
      secretPlayerName: result.secretPlayer?.name,
    });
  } catch (error) {
    console.error("Error assigning secret santa:", error);
    return NextResponse.json(
      { error: "Failed to assign secret santa" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import {
  getPlayersForAdmin,
  createPlayer,
  isPinTaken,
  verifyAdminPin,
} from "@/lib/db";

// Verify admin PIN from header
function checkAdminAuth(request: Request): boolean {
  const adminPin = request.headers.get("x-admin-pin");
  return adminPin ? verifyAdminPin(adminPin) : false;
}

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const players = await getPlayersForAdmin();
  return NextResponse.json(players);
}

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, pin, incompatibleIds } = await request.json();

    // Validate
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be exactly 4 digits" },
        { status: 400 }
      );
    }

    if (await isPinTaken(pin)) {
      return NextResponse.json(
        { error: "This PIN is already in use" },
        { status: 400 }
      );
    }

    const ids = Array.isArray(incompatibleIds)
      ? incompatibleIds.filter((id): id is number => typeof id === "number")
      : [];

    const player = await createPlayer(name.trim(), pin, ids);
    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    console.error("Error creating player:", error);
    return NextResponse.json(
      { error: "Failed to create player" },
      { status: 500 }
    );
  }
}

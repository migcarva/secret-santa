import { NextResponse } from "next/server";
import { deletePlayer, updatePlayer, updatePlayerIncompatibilities, verifyAdminPin } from "@/lib/db";

function checkAdminAuth(request: Request): boolean {
  const adminPin = request.headers.get("x-admin-pin");
  return adminPin ? verifyAdminPin(adminPin) : false;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const playerId = parseInt(id, 10);

  if (isNaN(playerId)) {
    return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
  }

  const result = await deletePlayer(playerId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const playerId = parseInt(id, 10);

  if (isNaN(playerId)) {
    return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
  }

  try {
    const { name, pin, incompatibleIds } = await request.json();

    // Update name/pin if provided
    if (name || pin) {
      const playerResult = await updatePlayer(playerId, { name, pin });
      if (!playerResult.success) {
        return NextResponse.json({ error: playerResult.error }, { status: 400 });
      }
    }

    // Update incompatibilities if provided
    if (incompatibleIds !== undefined) {
      const ids = Array.isArray(incompatibleIds)
        ? incompatibleIds.filter((id): id is number => typeof id === "number")
        : [];

      const result = await updatePlayerIncompatibilities(playerId, ids);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

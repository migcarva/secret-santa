import { NextResponse } from "next/server";
import { verifyAdminPin } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();

    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        { error: "PIN is required" },
        { status: 400 }
      );
    }

    if (verifyAdminPin(pin)) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Invalid PIN" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}

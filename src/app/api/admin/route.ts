import { NextResponse } from "next/server";

// Admin authentication — password stored server-side only
export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error("ADMIN_PASSWORD env variable not set");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (password === adminPassword) {
      return NextResponse.json({ authenticated: true });
    }

    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCustomerPortalSession } from "@/lib/services/stripe";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const portalSession = await createCustomerPortalSession(userId);

    return NextResponse.json({ 
      url: portalSession.url 
    });
  } catch (error) {
    console.error("Error creating customer portal session:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new NextResponse(`Error: ${errorMessage}`, { status: 500 });
  }
} 
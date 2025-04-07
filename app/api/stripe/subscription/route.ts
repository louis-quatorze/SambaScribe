import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserSubscription, canAccessPaidFeatures } from "@/lib/services/stripe";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const subscription = await getUserSubscription(userId);
    const hasAccess = await canAccessPaidFeatures(userId);

    return NextResponse.json({ 
      subscription,
      hasAccess
    });
  } catch (error) {
    console.error("Error getting subscription:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new NextResponse(`Error: ${errorMessage}`, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from "next/server";
import { basicReflectionScore } from "@/lib/scoring";
import { scoreReflectionWithAI } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domainId, reflection } = body as {
      domainId: string;
      reflection: string;
    };

    if (!domainId || typeof reflection !== "string") {
      return NextResponse.json(
        { error: "Missing domainId or reflection." },
        { status: 400 }
      );
    }

    const cleanedReflection = reflection.trim();

    if (!cleanedReflection) {
      return NextResponse.json(
        { error: "Reflection cannot be empty." },
        { status: 400 }
      );
    }

    // Try AI first
    try {
      const aiResult = await scoreReflectionWithAI(domainId, cleanedReflection);

      return NextResponse.json({
        mode: "ai",
        fallbackUsed: false,
        ...aiResult,
      });
    } catch (aiError) {
      console.error("AI reflection scoring failed, falling back to basic scoring.", aiError);

      const basic = basicReflectionScore(cleanedReflection, domainId);

      return NextResponse.json({
        mode: "basic",
        fallbackUsed: true,
        fallbackReason: "AI unavailable",
        ...basic,
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error." },
      { status: 500 }
    );
  }
}
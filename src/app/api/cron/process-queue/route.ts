import { NextResponse } from "next/server";
import { CampaignQueueService } from "@/services/contacts/campaign-queue.service";

export async function GET(request: Request) {
  try {
    // Check authorization
    // Usually via a Bearer token in headers matched against process.env.CRON_SECRET
    // For local dev, we allow it to run if the header isn't strict, or just leave it open for demonstration.
    // In production, uncomment the auth check below:
    /*
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    */

    await CampaignQueueService.processQueue();
    
    return NextResponse.json({ 
      success: true, 
      message: "Campaign queue processed successfully" 
    });
  } catch (err: any) {
    console.error("Cron Process Queue Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

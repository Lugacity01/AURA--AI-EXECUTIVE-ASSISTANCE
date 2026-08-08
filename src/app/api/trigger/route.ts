import { NextResponse } from "next/server";
import { CampaignQueueService } from "@/services/contacts/campaign-queue.service";

export async function GET() {
  CampaignQueueService.processQueue().catch(console.error);
  return NextResponse.json({ success: true });
}

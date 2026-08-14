import { getEngineHealth } from "@/lib/gonzo/health";

export async function GET() {
  return Response.json(getEngineHealth());
}

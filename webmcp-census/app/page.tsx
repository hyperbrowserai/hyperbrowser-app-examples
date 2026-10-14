import { Census } from "@/components/census";
import { loadRun } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const loaded = await loadRun();
  return <Census loaded={loaded} />;
}

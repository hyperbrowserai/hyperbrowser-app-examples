import { DesignApp } from "@/components/design-app";

export default function HomePage({
  searchParams,
}: {
  searchParams: { needApiKey?: string };
}) {
  return <DesignApp showApiKeyHint={searchParams.needApiKey === "1"} />;
}

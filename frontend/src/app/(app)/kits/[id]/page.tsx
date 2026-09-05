import { KitDetailView } from "@/features/kits/KitDetailView";

export default async function KitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <KitDetailView kitId={id} />;
}

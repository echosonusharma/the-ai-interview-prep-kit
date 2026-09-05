import { KitBuilderView } from "@/features/kits/KitBuilderView";

export default async function KitBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="px-4 md:px-6 lg:px-8 py-6">
      <KitBuilderView kitId={id} />
    </div>
  );
}

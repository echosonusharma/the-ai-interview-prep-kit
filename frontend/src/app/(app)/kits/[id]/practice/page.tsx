import { KitPracticeView } from "@/features/kits/KitPracticeView";

export default async function KitPracticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="px-4 md:px-6 lg:px-8 py-6">
      <KitPracticeView kitId={id} />
    </div>
  );
}

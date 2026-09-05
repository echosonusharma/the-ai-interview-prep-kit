import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { CreateKitForm } from "@/features/kits/CreateKitForm";
import { KitList } from "@/features/kits/KitList";

export default function NewKitPage() {
  return (
    <div className="w-full px-4 py-6 md:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef0ff] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#5b5bf5]">
            <Sparkles size={12} strokeWidth={2.5} aria-hidden /> Kits
          </span>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0b1220]">Interview kits</h1>
          <p className="mt-1 text-sm text-[#67708f]">
            Create a new kit below — every kit you own lives here too.
          </p>
        </div>
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[440px_1fr]">
        {/* Creator */}
        <div className="xl:sticky xl:top-6">
          <CreateKitForm />
        </div>

        {/* Gallery */}
        <section aria-label="Your kits" className="min-w-0">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-[#8a8fa8]">
            Your kits
          </h2>
          <Suspense
            fallback={
              <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3" aria-label="Loading kits">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-44 animate-pulse rounded-2xl border border-[#e6e8f2] bg-white" />
                ))}
              </div>
            }
          >
            <KitList
              showNewTile={false}
              sortable
              searchable
              paginate
              pageSize={6}
              gridClassName="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3 w-full"
            />
          </Suspense>
        </section>
      </div>
    </div>
  );
}

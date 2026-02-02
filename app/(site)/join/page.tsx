import JoinRequestForm from "./JoinRequestForm";

export const dynamic = "force-dynamic";

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-zinc-900">
      <section className="mx-auto max-w-2xl px-4 py-10">
        <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white/90 shadow-sm">
          <div className="border-b border-emerald-100 px-6 py-5">
            <p className="text-xs font-semibold text-emerald-800">Team Humanity</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Request to Join</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Share your story and we’ll review your request.
            </p>
          </div>

          <div className="p-6">
            <JoinRequestForm />
          </div>
        </div>
      </section>
    </main>
  );
}

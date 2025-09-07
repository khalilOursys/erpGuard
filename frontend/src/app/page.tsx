export default function Page() {
  return (
    <div className="container max-w-7xl mx-auto space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold">Active Missions</h3>
          <p className="text-muted mt-2">12 ongoing</p>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold">Personnel On Duty</h3>
          <p className="text-muted mt-2">87 total</p>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold">This Month Billing</h3>
          <p className="text-muted mt-2">$23,450</p>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-semibold">Recent activity</h2>
        <div className="mt-4 text-sm text-muted">No activity yet — start by creating a mission or importing personnel.</div>
      </section>
    </div>
  );
}

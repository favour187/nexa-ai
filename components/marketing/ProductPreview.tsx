/** Static marketing preview of the dashboard — no live user data. */
export function ProductPreview() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[28px] bg-brand-500/10 blur-2xl"
      />
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card-hover">
        <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="ml-3 text-[11px] font-medium text-slate-400">
            nexa.app / dashboard
          </span>
        </div>
        <div className="grid gap-0 sm:grid-cols-[140px_1fr]">
          <aside className="hidden border-r border-slate-100 bg-slate-50/80 p-4 sm:block">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-[10px] font-bold text-white">
                N
              </span>
              <span className="text-xs font-semibold text-slate-800">NEXA</span>
            </div>
            <ul className="mt-5 space-y-1.5 text-[11px]">
              {[
                ["Dashboard", true],
                ["Goals", false],
                ["Reminders", false],
                ["What-If", false],
              ].map(([label, active]) => (
                <li
                  key={String(label)}
                  className={
                    active
                      ? "rounded-md bg-brand-50 px-2 py-1.5 font-medium text-brand-700"
                      : "rounded-md px-2 py-1.5 text-slate-500"
                  }
                >
                  {label}
                </li>
              ))}
            </ul>
          </aside>
          <div className="space-y-3 p-4 sm:p-5">
            <p className="text-[11px] font-medium text-brand-600">Wednesday, August 19</p>
            <h3 className="text-base font-semibold tracking-tight text-slate-900">
              What should I do now?
            </h3>
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                Do this now
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                Easy 5 km base run
              </p>
              <p className="mt-0.5 text-[11px] text-slate-600">
                Base-building week · you have 40 minutes today.
              </p>
            </div>
            <div className="space-y-2">
              {[
                ["Draft race-week taper plan", "Today · 25 min"],
                ["Long run — 12 km easy", "Sat · 80 min"],
              ].map(([title, meta]) => (
                <div
                  key={title}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-800">{title}</p>
                    <p className="text-[10px] text-slate-500">{meta}</p>
                  </div>
                  <span className="h-4 w-4 rounded border border-slate-300" />
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Half-marathon · 12 weeks</span>
                <span>38%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[38%] rounded-full bg-brand-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

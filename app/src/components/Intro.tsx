export default function Intro() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-6 pt-14 md:px-10 md:pb-10 md:pt-20">
      <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="eyebrow mb-4">One week · a small repertoire</div>
          <h1 className="text-5xl font-normal leading-[1.05] text-ink md:text-6xl">
            Cook from what's here.
          </h1>
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-muted md:text-right">
          Household batches start at four.<br />
          "My plate" portions are just for one adult.
        </p>
      </div>
    </section>
  )
}

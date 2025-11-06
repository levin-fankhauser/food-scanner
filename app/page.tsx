import OpenFoodFactsSearch from "../components/OpenFoodFactsSearch";

export default function Home() {
  return (
    <main className="min-h-screen bg-linear-to-br from-sky-50 via-white to-indigo-100 px-4 py-16 font-sans">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="space-y-4 text-center">
          <span className="inline-flex items-center justify-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-sky-600 shadow-sm shadow-white">
            Food Scanner
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            Entdecke Lebensmittel in Sekunden
          </h1>
          <p className="mx-auto max-w-2xl text-base text-zinc-600">
            Nutze den integrierten Barcode-Scanner oder die manuelle Suche, um
            sofort Nährwert- und Produktdaten aus der Open-Food-Facts-Datenbank
            zu erhalten.
          </p>
        </header>
        <OpenFoodFactsSearch />
      </div>
    </main>
  );
}

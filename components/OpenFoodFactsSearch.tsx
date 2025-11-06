"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import OpenFoodFacts, { Product } from "@openfoodfacts/openfoodfacts-nodejs";

import BarcodeScanner from "./BarcodeScanner";

type ProductWithExtensions = Product & {
  product_name_de?: string;
  image_front_url?: string;
  nutrition_grade_fr?: string;
  categories_tags?: string[];
};

const createClient = () =>
  new OpenFoodFacts(globalThis.fetch, { language: "de" });

export default function OpenFoodFactsSearch() {
  const client = useMemo(createClient, []);
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState<ProductWithExtensions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const performLookup = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) {
        setError("Bitte geben Sie eine gültige Artikelnummer ein.");
        setProduct(null);
        return;
      }
      setLoading(true);
      setError(null);
      setProduct(null);
      try {
        const result = await client.getProductV2(trimmed);
        if (result.error) {
          setError("Fehler bei der Kommunikation mit der Open Food Facts API.");
          return;
        }
        const data = result.data as
          | { status?: number; product?: ProductWithExtensions }
          | undefined;
        if (data?.product && (data.status === 1 || data.status === undefined)) {
          setProduct(data.product);
          setBarcode("");
          return;
        }
        setError(`Kein Produkt mit der Artikelnummer "${trimmed}" gefunden.`);
      } catch (err) {
        setError("Fehler bei der Kommunikation mit der Open Food Facts API.");
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  const fetchProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await performLookup(barcode);
  };

  const handleScan = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) {
        return;
      }
      setLastScannedCode(trimmed);
      setBarcode(trimmed);
      void performLookup(trimmed);
    },
    [performLookup]
  );

  const categories = product?.categories_tags
    ?.map((tag) => tag.split(":").pop())
    .filter(Boolean)
    .join(", ");

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-zinc-200 bg-white/80 p-8 shadow-2xl shadow-sky-100/40 backdrop-blur">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-600">
            Suche
          </span>
          <h2 className="text-3xl font-semibold text-zinc-900">
            Open Food Facts Explorer
          </h2>
          <p className="text-sm text-zinc-500">
            Scanne einen Barcode oder gib eine Artikelnummer ein, um
            Produktinformationen sekundenschnell abzurufen.
          </p>
        </div>

        <form
          onSubmit={fetchProduct}
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
            placeholder="Artikelnummer (z.B. 737628064502)"
            className="w-full flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base shadow-inner shadow-zinc-200 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:bg-zinc-100 disabled:text-zinc-400"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:-translate-y-0.5 hover:bg-sky-400 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none"
          >
            {loading ? "Lade..." : "Suchen"}
          </button>
        </form>

        {lastScannedCode && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-2 text-xs font-semibold text-sky-700">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            Zuletzt gescannt: {lastScannedCode}
          </div>
        )}

        <div className="mt-8">
          <BarcodeScanner onScan={handleScan} />
        </div>

        {loading && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-2 text-sm font-medium text-sky-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
            Daten werden von der API abgerufen...
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            Fehler: {error}
          </div>
        )}

        {!loading && !error && !product && (
          <p className="mt-6 text-sm text-zinc-500">
            Gib einen Code ein oder nutze den Scanner, um sofort
            Produktinformationen anzuzeigen.
          </p>
        )}

        {product && (
          <div className="mt-8 rounded-3xl border border-zinc-200 bg-white/70 p-6 shadow-inner shadow-zinc-200">
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-500">
                    Produkt
                  </p>
                  <h3 className="text-2xl font-semibold text-zinc-900">
                    {product.product_name_de ||
                      product.product_name ||
                      "Produktname unbekannt"}
                  </h3>
                  <p className="text-sm text-zinc-500">
                    Artikelnummer {product.code}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                      Marke
                    </p>
                    <p className="mt-1 text-sm font-medium text-zinc-900">
                      {product.brands || "Nicht verfügbar"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                      Kategorien
                    </p>
                    <p className="mt-1 text-sm font-medium text-zinc-900">
                      {categories || "Nicht verfügbar"}
                    </p>
                  </div>
                </div>

                {product.nutrition_grade_fr && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
                    Nutri-Score
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500 text-base font-bold text-white">
                      {product.nutrition_grade_fr.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {product.image_front_url && (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={product.image_front_url}
                    alt={`Produktabbildung von ${product.product_name}`}
                    className="w-full max-w-xs rounded-3xl border border-white/80 bg-white/80 object-contain p-2 shadow-xl shadow-sky-100/40"
                    style={{ maxHeight: "13rem" }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

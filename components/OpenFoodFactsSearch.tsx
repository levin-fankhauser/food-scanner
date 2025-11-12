"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import OpenFoodFacts, {
  Product,
  SearchQueryV2,
  SearchResult,
} from "@openfoodfacts/openfoodfacts-nodejs";

import BarcodeScanner from "./BarcodeScanner";

type ProductWithExtensions = Product & {
  product_name_de?: string;
  image_front_url?: string;
  nutrition_grade_fr?: string;
  categories_tags?: string[];
  image_front_small_url?: string;
  ecoscore_grade?: string;
  countries_tags?: string[];
  purchase_places_tags?: string[];
  stores_tags?: string[];
  stores?: string;
};

const createClient = () =>
  new OpenFoodFacts(globalThis.fetch, { language: "de" });

const SWISS_COUNTRY_TAGS = [
  "en:switzerland",
  "de:schweiz",
  "fr:suisse",
  "it:svizzera",
];

const COOP_STORE_TAGS = [
  "coop",
  "coop-prix-garantie",
  "coop-pronto",
  "coop-city",
  "coop-to-go",
  "coop-restaurant",
  "coop-vitality",
];

const normalizeGrade = (grade?: string | null) =>
  grade?.trim().toUpperCase() ?? "";

const INVALID_SCORE_VALUES = new Set([
  "",
  "UNKNOWN",
  "NOT-APPLICABLE",
  "NOT_APPLICABLE",
]);

const isValidScore = (grade?: string | null) => {
  const normalized = normalizeGrade(grade);
  return normalized.length > 0 && !INVALID_SCORE_VALUES.has(normalized);
};

const isDistributedInSwitzerland = (item: ProductWithExtensions) => {
  const normalized = (values?: string[]) =>
    values?.map((entry) => entry.toLowerCase()) ?? [];
  const countryMatches = normalized(item.countries_tags).some((tag) =>
    SWISS_COUNTRY_TAGS.includes(tag)
  );
  const purchaseMatches = normalized(item.purchase_places_tags).some(
    (tag) => tag === "switzerland"
  );
  return countryMatches || purchaseMatches;
};

const isAvailableAtCoop = (item: ProductWithExtensions) => {
  const tagMatches = item.stores_tags?.some((tag) => {
    const normalizedTag = tag.toLowerCase();
    const cleanTag = normalizedTag.split(":").pop() ?? normalizedTag;
    return COOP_STORE_TAGS.includes(cleanTag);
  });

  if (tagMatches) {
    return true;
  }

  const stores = item.stores?.toLowerCase() ?? "";
  if (!stores) {
    return false;
  }

  const normalizedNames = stores
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  return normalizedNames.some((name) => name.includes("coop"));
};

type ScoreBadgeProps = {
  label: string;
  grade?: string | null;
  variant: "nutrition" | "eco";
};

const ScoreBadge = ({ label, grade, variant }: ScoreBadgeProps) => {
  const normalized = normalizeGrade(grade);
  const isValid = isValidScore(grade);
  const displayValue = isValid ? normalized : "–";

  const palette =
    variant === "nutrition"
      ? {
          activeBg: "bg-emerald-100 text-emerald-700",
          activePill: "bg-emerald-500",
        }
      : {
          activeBg: "bg-lime-100 text-lime-700",
          activePill: "bg-lime-500",
        };

  const inactiveBg = "bg-zinc-200 text-zinc-500";
  const inactivePill = "bg-zinc-400";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wide ${
        isValid ? palette.activeBg : inactiveBg
      }`}
    >
      {label}
      <span
        className={`grid h-8 w-8 place-items-center rounded-full text-base font-bold text-white ${
          isValid ? palette.activePill : inactivePill
        }`}
        aria-label={
          isValid ? `${label}: ${displayValue}` : `${label} nicht verfügbar`
        }
      >
        {displayValue}
      </span>
    </span>
  );
};

type AlternativeSectionProps = {
  title: string;
  products: ProductWithExtensions[];
  loading: boolean;
  error: string | null;
  focus: "nutrition" | "eco";
};

function AlternativeSection({
  title,
  products,
  loading,
  error,
  focus,
}: AlternativeSectionProps) {
  const gradeLabel = focus === "nutrition" ? "Nutri-Score" : "Eco-Score";

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white/70 p-6 shadow-inner shadow-zinc-200">
      <header className="flex items-center justify-between">
        <h4 className="text-xl font-semibold text-zinc-900">{title}</h4>
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-500">
          Vorschläge
        </span>
      </header>

      {loading && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-2 text-sm font-medium text-sky-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
          Empfehlungen werden geladen...
        </div>
      )}

      {!loading && error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <p className="mt-4 text-sm text-zinc-500">
          Keine passenden Alternativen gefunden.
        </p>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((item) => {
            const displayName =
              item.product_name_de ||
              item.product_name ||
              "Produktname unbekannt";
            const brand = item.brands || "Nicht verfügbar";
            const imageUrl =
              item.image_front_small_url || item.image_front_url || undefined;
            const grade =
              focus === "nutrition"
                ? item.nutrition_grade_fr
                : item.ecoscore_grade;

            return (
              <article
                key={item.code}
                className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white px-4 py-5 shadow-sm shadow-zinc-200"
              >
                <div className="flex flex-1 flex-col gap-3">
                  <div>
                    <h5 className="text-base font-semibold text-zinc-900">
                      {displayName}
                    </h5>
                    <p className="text-xs text-zinc-500">
                      Art.-Nr. {item.code}
                    </p>
                  </div>
                  <p className="text-sm text-zinc-600">Marke: {brand}</p>
                  <ScoreBadge
                    label={gradeLabel}
                    grade={grade}
                    variant={focus === "nutrition" ? "nutrition" : "eco"}
                  />
                </div>

                {imageUrl && (
                  <div className="relative h-28 w-full overflow-hidden rounded-2xl border border-white/80 bg-white/80 p-2">
                    <Image
                      src={imageUrl}
                      alt={`Produktabbildung von ${displayName}`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 220px"
                      className="object-contain"
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function OpenFoodFactsSearch() {
  const client = useMemo(createClient, []);
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState<ProductWithExtensions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [healthyAlternatives, setHealthyAlternatives] = useState<
    ProductWithExtensions[]
  >([]);
  const [sustainableAlternatives, setSustainableAlternatives] = useState<
    ProductWithExtensions[]
  >([]);
  const [healthyLoading, setHealthyLoading] = useState(false);
  const [sustainableLoading, setSustainableLoading] = useState(false);
  const [healthyError, setHealthyError] = useState<string | null>(null);
  const [sustainableError, setSustainableError] = useState<string | null>(null);

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
      setHealthyAlternatives([]);
      setSustainableAlternatives([]);
      setHealthyError(null);
      setSustainableError(null);
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
      } catch {
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

  useEffect(() => {
    if (!product) {
      setHealthyAlternatives([]);
      setSustainableAlternatives([]);
      setHealthyError(null);
      setSustainableError(null);
      setHealthyLoading(false);
      setSustainableLoading(false);
      return;
    }

    const categoryTag =
      product.categories_tags?.[product.categories_tags.length - 1] ??
      product.categories_tags?.[0];

    if (!categoryTag) {
      setHealthyAlternatives([]);
      setSustainableAlternatives([]);
      const message = "Für dieses Produkt fehlen Kategorien-Tags.";
      setHealthyError(message);
      setSustainableError(message);
      setHealthyLoading(false);
      setSustainableLoading(false);
      return;
    }

    const fields = [
      "code",
      "product_name",
      "product_name_de",
      "brands",
      "image_front_small_url",
      "image_front_url",
      "nutrition_grade_fr",
      "ecoscore_grade",
      "categories_tags",
      "countries_tags",
      "purchase_places_tags",
      "stores_tags",
      "stores",
    ].join(",");

    const baseQuery: Record<string, string | number> = {
      categories_tags: categoryTag,
      countries_tags: SWISS_COUNTRY_TAGS.join("|"),
      stores_tags: COOP_STORE_TAGS.join("|"),
      page_size: 5,
      fields,
    };

    setHealthyLoading(true);
    setSustainableLoading(true);
    setHealthyError(null);
    setSustainableError(null);

    let isActive = true;

    const fetchAlternatives = async () => {
      try {
        const healthyQuery = {
          ...baseQuery,
          nutrition_grades_tags: "a|b",
          sort_by: "nutriscore_score",
        } as SearchQueryV2;
        const sustainableQuery = {
          ...baseQuery,
          ecoscore_grade: "a|b",
          sort_by: "ecoscore_score",
        } as SearchQueryV2;

        const [healthyResult, sustainableResult] = await Promise.all([
          client.search(healthyQuery),
          client.search(sustainableQuery),
        ]);

        if (!isActive) {
          return;
        }

        if (healthyResult.error) {
          setHealthyAlternatives([]);
          setHealthyError(
            "Fehler beim Laden gesunder Alternativen. Bitte erneut versuchen."
          );
        } else {
          const healthyData = healthyResult.data as SearchResult | undefined;
          const products = (healthyData?.products ??
            []) as ProductWithExtensions[];
          setHealthyAlternatives(
            products.filter(
              (item) =>
                item.code !== product.code &&
                isDistributedInSwitzerland(item) &&
                isAvailableAtCoop(item) &&
                isValidScore(item.nutrition_grade_fr)
            )
          );
        }

        if (sustainableResult.error) {
          setSustainableAlternatives([]);
          setSustainableError(
            "Fehler beim Laden nachhaltiger Alternativen. Bitte erneut versuchen."
          );
        } else {
          const sustainableData = sustainableResult.data as
            | SearchResult
            | undefined;
          const products = (sustainableData?.products ??
            []) as ProductWithExtensions[];
          setSustainableAlternatives(
            products.filter(
              (item) =>
                item.code !== product.code &&
                isDistributedInSwitzerland(item) &&
                isAvailableAtCoop(item) &&
                isValidScore(item.ecoscore_grade)
            )
          );
        }
      } catch {
        if (!isActive) {
          return;
        }
        setHealthyAlternatives([]);
        setSustainableAlternatives([]);
        const message =
          "Alternativen konnten nicht geladen werden. Bitte später erneut versuchen.";
        setHealthyError(message);
        setSustainableError(message);
      } finally {
        if (isActive) {
          setHealthyLoading(false);
          setSustainableLoading(false);
        }
      }
    };

    void fetchAlternatives();

    return () => {
      isActive = false;
    };
  }, [client, product]);

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
          <div className="mt-8 space-y-6">
            <div className="rounded-3xl border border-zinc-200 bg-white/70 p-6 shadow-inner shadow-zinc-200">
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

                  <div className="flex flex-wrap gap-3">
                    <ScoreBadge
                      label="Nutri-Score"
                      grade={product.nutrition_grade_fr}
                      variant="nutrition"
                    />
                    <ScoreBadge
                      label="Eco-Score"
                      grade={product.ecoscore_grade}
                      variant="eco"
                    />
                  </div>
                </div>

                {product.image_front_url && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative h-52 w-full max-w-xs overflow-hidden rounded-3xl border border-white/80 bg-white/80 p-2 shadow-xl shadow-sky-100/40">
                      <Image
                        src={product.image_front_url}
                        alt={`Produktabbildung von ${product.product_name}`}
                        fill
                        sizes="(max-width: 768px) 100vw, 260px"
                        className="object-contain"
                        priority
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <AlternativeSection
              title="Gesund"
              products={healthyAlternatives}
              loading={healthyLoading}
              error={healthyError}
              focus="nutrition"
            />

            <AlternativeSection
              title="Nachhaltig"
              products={sustainableAlternatives}
              loading={sustainableLoading}
              error={sustainableError}
              focus="eco"
            />
          </div>
        )}
      </div>
    </section>
  );
}

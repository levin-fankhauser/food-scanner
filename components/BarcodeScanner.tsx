"use client";

import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { useEffect, useMemo, useRef, useState } from "react";

type BarcodeScannerProps = {
  onScan: (value: string) => void;
};

type CameraOption = {
  label: string;
  deviceId: string;
};

export default function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reader = useMemo(() => new BrowserMultiFormatReader(), []);
  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    reader
      .listVideoInputDevices()
      .then((devices) => {
        if (!active) return;
        const options = devices.map((device) => ({
          label: device.label || `Kamera ${device.deviceId.slice(-4)}`,
          deviceId: device.deviceId,
        }));
        setCameras(options);
        if (options.length > 0) {
          setSelectedDeviceId(options[0].deviceId);
        }
      })
      .catch(() => {
        if (!active) return;
        setError("Keine Kamera gefunden oder Zugriff verweigert.");
      });

    return () => {
      active = false;
      reader.reset();
    };
  }, [reader]);

  const stopScanning = () => {
    reader.reset();
    setIsScanning(false);
  };

  const startScanning = () => {
    if (!videoRef.current) return;
    if (isScanning) return;
    if (!selectedDeviceId) {
      setError("Bitte eine Kamera auswählen.");
      return;
    }
    setError(null);
    reader
      .decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, err) => {
          if (result) {
            const text = result.getText();
            if (text) {
              onScan(text);
              stopScanning();
            }
          }
          if (err && !(err instanceof NotFoundException)) {
            setError("Scan fehlgeschlagen. Bitte erneut versuchen.");
          }
        }
      )
      .then(() => setIsScanning(true))
      .catch(() => {
        setError("Kamera konnte nicht gestartet werden.");
        stopScanning();
      });
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white/90 p-6 text-zinc-900 shadow-xl shadow-sky-100/40">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1 space-y-3">
          <label
            htmlFor="camera-select"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600"
          >
            Kamera auswählen
          </label>
          <select
            id="camera-select"
            value={selectedDeviceId ?? ""}
            onChange={(event) =>
              setSelectedDeviceId(
                event.target.value ? event.target.value : null
              )
            }
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 shadow-inner shadow-zinc-200 transition focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:bg-zinc-100 disabled:text-zinc-400"
            disabled={isScanning}
          >
            {cameras.map((camera) => (
              <option
                key={camera.deviceId}
                value={camera.deviceId}
                className="bg-white text-zinc-900"
              >
                {camera.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500">
            Wähle eine Kameraquelle aus und starte anschließend den Live-Scan.
          </p>
        </div>
        <div className="flex items-center gap-3 lg:flex-col lg:items-stretch">
          <button
            type="button"
            onClick={startScanning}
            disabled={isScanning || cameras.length === 0 || !selectedDeviceId}
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-400 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-zinc-600 disabled:text-zinc-300 disabled:shadow-none"
          >
            {isScanning ? "Aktiv" : "Start"}
          </button>
          <button
            type="button"
            onClick={stopScanning}
            disabled={!isScanning}
            className="inline-flex items-center justify-center rounded-2xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 transition hover:-translate-y-0.5 hover:bg-rose-400 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-zinc-600 disabled:text-zinc-300 disabled:shadow-none"
          >
            Stop
          </button>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 sm:w-[360px]">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
          />
          {!isScanning && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 text-center text-sm font-medium text-sky-700 backdrop-blur">
              <span>Kamera bereit</span>
              <span className="text-xs font-normal text-sky-600">
                Starte den Scan oben, richte den Barcode im Sichtfeld aus.
              </span>
            </div>
          )}
        </div>
        <div className="w-full max-w-xs rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-xs text-zinc-500">
          <p className="text-sm font-semibold text-zinc-900">
            Tipps für bessere Scans
          </p>
          <ul className="mt-3 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
              <span>
                Halte den Code möglichst ruhig und nutze ausreichend Licht.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
              <span>
                Achte darauf, dass der Barcode vollständig im Rahmen bleibt.
              </span>
            </li>
          </ul>
        </div>
      </div>
      {error && (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      {cameras.length === 0 && !error && (
        <p className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
          Keine Kameras gefunden. Erteile der Anwendung Kamerazugriff und lade
          die Seite neu.
        </p>
      )}
    </div>
  );
}

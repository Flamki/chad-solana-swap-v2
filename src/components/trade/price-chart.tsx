import { useEffect, useRef } from "react";
import { createChart, AreaSeries, type IChartApi, type ISeriesApi, ColorType } from "lightweight-charts";

export function PriceChart({ data }: { data: { time: number; value: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const initW = el.clientWidth || 600;
    const initH = el.clientHeight || 360;
    const chart = createChart(ref.current, {
      width: initW,
      height: initH,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9aa0b4",
        fontFamily: "JetBrains Mono, monospace",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
      timeScale: { borderColor: "rgba(255,255,255,0.08)", timeVisible: true },
      crosshair: { mode: 1 },
    });
    const series = chart.addSeries(AreaSeries, {
      lineColor: "#7af56f",
      topColor: "rgba(122, 245, 111, 0.4)",
      bottomColor: "rgba(122, 245, 111, 0.02)",
      lineWidth: 2,
    });
    chartRef.current = chart;
    seriesRef.current = series;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) chart.resize(cr.width, cr.height);
    });
    ro.observe(el);
    return () => { ro.disconnect(); chart.remove(); };
  }, []);

  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.setData(
      data.map((d) => ({ time: d.time as never, value: d.value }))
    );
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return <div ref={ref} className="h-full w-full min-h-[300px]" style={{ height: "100%" }} />;
}
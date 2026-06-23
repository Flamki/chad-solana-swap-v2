import {
  AreaSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { useEffect, useMemo, useRef } from "react";

type Point = { time: number; value: number };

export function PriceChart({ data }: { data: Point[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  const chartData = useMemo(
    () =>
      data.map((point) => ({
        time: point.time as Time,
        value: point.value,
      })),
    [data],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(245, 245, 255, 0.62)",
        fontFamily: "JetBrains Mono, ui-monospace, monospace",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        horzLine: { color: "rgba(124, 58, 237, 0.4)" },
        vertLine: { color: "rgba(124, 58, 237, 0.4)" },
      },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: "#8B5CF6",
      topColor: "rgba(139, 92, 246, 0.42)",
      bottomColor: "rgba(20, 184, 166, 0.02)",
      lineWidth: 2,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    seriesRef.current?.setData(chartData);
    chartRef.current?.timeScale().fitContent();
  }, [chartData]);

  return (
    <div className="relative h-full min-h-[300px] w-full">
      <div ref={containerRef} className="h-full w-full" />
      <a
        href="https://www.tradingview.com/lightweight-charts/"
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-2 left-3 rounded bg-background/70 px-2 py-1 text-[10px] font-mono text-muted-foreground backdrop-blur hover:text-foreground"
      >
        TradingView Lightweight Charts
      </a>
    </div>
  );
}

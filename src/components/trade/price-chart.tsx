import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  PriceScaleMode,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type Time,
  createChart,
} from "lightweight-charts";
import { ChartCandlestick, Crosshair, Maximize2, Settings2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ChartInterval, MarketDataStatus, PricePoint } from "@/lib/market-data";
import { formatCompact, formatUsd, type Token } from "@/lib/tokens";

const intervals: ChartInterval[] = ["1m", "5m", "15m", "1H", "4H", "1D"];

type ChartMetric = "price" | "mcap";
type QuoteCurrency = "usd" | "sol";

export function PriceChart({
  data,
  dataStatus,
  provider,
  updatedAt,
  token,
  solPrice,
  interval,
  onIntervalChange,
}: {
  data: PricePoint[];
  dataStatus: MarketDataStatus;
  provider: "birdeye" | "geckoterminal" | "solana-rpc";
  updatedAt: string;
  token: Token;
  solPrice: number;
  interval: ChartInterval;
  onIntervalChange: (interval: ChartInterval) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [metric, setMetric] = useState<ChartMetric>("price");
  const [quote, setQuote] = useState<QuoteCurrency>("usd");
  const [crosshairEnabled, setCrosshairEnabled] = useState(true);
  const [logScale, setLogScale] = useState(false);

  const tokenSupply = token.price > 0 && token.marketCap > 0 ? token.marketCap / token.price : 0;
  const priceLabel = `${token.symbol}/${quote.toUpperCase()}`;
  const metricLabel = metric === "mcap" ? "Market Cap" : "Price";
  const exchangeLabel = quote === "usd" ? "USD" : "SOL";

  const { candles, volumes, latest, first } = useMemo(() => {
    let previousClose = data[0]?.value ?? 0;
    const transform = (value: number) => {
      const priced = metric === "mcap" && tokenSupply > 0 ? value * tokenSupply : value;
      return quote === "sol" && solPrice > 0 ? priced / solPrice : priced;
    };

    const candleData: CandlestickData[] = data
      .map((point) => {
        const close = point.close ?? point.value;
        const open = (point.open ?? previousClose) || close;
        const high = point.high ?? Math.max(open, close);
        const low = point.low ?? Math.min(open, close);
        previousClose = close;

        return {
          time: point.time as Time,
          open: transform(open),
          high: transform(high),
          low: transform(low),
          close: transform(close),
        };
      })
      .filter((point) => [point.open, point.high, point.low, point.close].every(Number.isFinite));

    const volumeData: HistogramData[] = data
      .map((point, index) => {
        const candle = candleData[index];
        if (!candle) return null;

        return {
          time: candle.time,
          value: point.volume ?? 0,
          color:
            candle.close >= candle.open ? "rgba(20, 241, 149, 0.42)" : "rgba(255, 76, 104, 0.46)",
        };
      })
      .filter(Boolean) as HistogramData[];

    return {
      candles: candleData,
      volumes: volumeData,
      latest: candleData.at(-1),
      first: candleData[0],
    };
  }, [data, metric, quote, solPrice, tokenSupply]);

  const change = latest && first ? latest.close - first.open : 0;
  const changePct = latest && first && first.open > 0 ? (change / first.open) * 100 : 0;
  const up = change >= 0;
  const latestVolume = volumes.at(-1)?.value ?? 0;

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
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.07)" },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.12, bottom: 0.28 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 9,
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        mouseWheel: false,
        pinch: true,
        axisPressedMouseMove: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        horzLine: { color: "rgba(139, 92, 246, 0.45)" },
        vertLine: { color: "rgba(139, 92, 246, 0.45)" },
      },
      localization: {
        priceFormatter: (price: number) => formatUsd(price),
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#14F195",
      downColor: "#FF4D68",
      borderUpColor: "#14F195",
      borderDownColor: "#FF4D68",
      wickUpColor: "#14F195",
      wickDownColor: "#FF4D68",
      priceLineColor: "#8B5CF6",
      priceLineWidth: 1,
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      borderVisible: false,
      scaleMargins: { top: 0.78, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.applyOptions({
      localization: {
        priceFormatter: (price: number) => formatChartValue(price, metric, quote),
      },
    });
    candleSeriesRef.current?.setData(candles);
    volumeSeriesRef.current?.setData(volumes);
    chartRef.current?.timeScale().fitContent();
  }, [candles, metric, quote, volumes]);

  useEffect(() => {
    chartRef.current?.applyOptions({
      crosshair: {
        mode: crosshairEnabled ? CrosshairMode.Normal : CrosshairMode.Hidden,
      },
    });
  }, [crosshairEnabled]);

  useEffect(() => {
    chartRef.current?.priceScale("right").applyOptions({
      mode: logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
    });
  }, [logScale]);

  return (
    <div className="relative flex h-full min-h-[300px] w-full flex-col overflow-hidden rounded-xl bg-background/25">
      <div className="flex min-h-12 items-center gap-2 overflow-x-auto border-b border-border/70 px-3 py-2 text-xs">
        <div className="flex items-center gap-1 pr-2">
          {intervals.map((item) => (
            <button
              key={item}
              onClick={() => onIntervalChange(item)}
              className={`rounded-md px-2 py-1 font-mono transition ${
                interval === item
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-card hover:text-foreground"
              }`}
            >
              {item.replace("H", "h")}
            </button>
          ))}
        </div>
        <Divider />
        <Segmented
          value={metric}
          options={[
            ["price", "Price"],
            ["mcap", "MCAP"],
          ]}
          onChange={setMetric}
        />
        <Divider />
        <Segmented
          value={quote}
          options={[
            ["usd", "USD"],
            ["sol", "SOL"],
          ]}
          onChange={setQuote}
        />
        <Divider />
        <div className="flex items-center gap-1 text-muted-foreground">
          <ChartCandlestick className="h-3.5 w-3.5 text-primary" />
          Vol <span className="font-mono text-foreground">${formatCompact(latestVolume)}</span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[10px]">
          <span className={dataStatus === "live" ? "text-primary" : "text-amber-400"}>
            {provider === "birdeye" ? "BirdEye" : "GeckoTerminal"} {dataStatus.toUpperCase()}
          </span>
          <span className="text-muted-foreground">{new Date(updatedAt).toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div className="absolute left-0 top-0 z-10 flex h-full w-11 flex-col items-center gap-2 border-r border-border/50 bg-background/35 py-4 backdrop-blur">
          <ChartTool
            label="Toggle crosshair"
            active={crosshairEnabled}
            onClick={() => setCrosshairEnabled((value) => !value)}
            icon={<Crosshair className="h-4 w-4" />}
          />
          <ChartTool
            label="Toggle logarithmic scale"
            active={logScale}
            onClick={() => setLogScale((value) => !value)}
            icon={<Settings2 className="h-4 w-4" />}
          />
          <ChartTool
            label="Fit chart"
            onClick={() => chartRef.current?.timeScale().fitContent()}
            icon={<Maximize2 className="h-4 w-4" />}
          />
        </div>
        <div className="pointer-events-none absolute left-14 top-3 z-10 rounded-lg bg-background/50 px-3 py-2 font-mono text-xs backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-foreground">
              {priceLabel} ({metricLabel}) / {interval.replace("H", "h")} /{" "}
              {provider === "birdeye" ? "BirdEye" : "GeckoTerminal"}
            </span>
            <span className={up ? "text-primary" : "text-destructive"}>
              {up ? "+" : ""}
              {formatChartValue(change, metric, quote)} ({up ? "+" : ""}
              {changePct.toFixed(2)}%)
            </span>
          </div>
          {latest && (
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-muted-foreground">
              <span>O {formatChartValue(latest.open, metric, quote)}</span>
              <span>H {formatChartValue(latest.high, metric, quote)}</span>
              <span>L {formatChartValue(latest.low, metric, quote)}</span>
              <span>C {formatChartValue(latest.close, metric, quote)}</span>
              <span>{exchangeLabel}</span>
            </div>
          )}
        </div>
        <div ref={containerRef} className="h-full w-full pl-11" />
        <a
          href="https://www.tradingview.com/lightweight-charts/"
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-2 left-14 rounded bg-background/70 px-2 py-1 text-[10px] font-mono text-muted-foreground backdrop-blur hover:text-foreground"
        >
          TradingView Lightweight Charts
        </a>
      </div>
    </div>
  );
}

function ChartTool({
  label,
  icon,
  active = false,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid h-7 w-7 place-items-center rounded-md transition ${
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-card hover:text-foreground"
      }`}
    >
      {icon}
    </button>
  );
}

function Divider() {
  return <div className="h-5 w-px shrink-0 bg-border" />;
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex shrink-0 rounded-lg border border-border bg-background/50 p-0.5">
      {options.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`rounded-md px-2 py-1 font-mono transition ${
            value === key
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function formatChartValue(value: number, metric: ChartMetric, quote: QuoteCurrency) {
  if (!Number.isFinite(value)) return quote === "usd" ? "$0.00" : "0.00 SOL";

  if (metric === "mcap") {
    const compact = formatCompact(Math.abs(value));
    const sign = value < 0 ? "-" : "";
    return quote === "usd" ? `${sign}$${compact}` : `${sign}${compact} SOL`;
  }

  if (quote === "sol") {
    return `${value < 0 ? "-" : ""}${Math.abs(value).toLocaleString(undefined, {
      maximumFractionDigits: Math.abs(value) < 1 ? 8 : 4,
    })} SOL`;
  }

  return formatUsd(value);
}

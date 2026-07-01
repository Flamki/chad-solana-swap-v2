import {
  AreaSeries,
  BarSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  PriceScaleMode,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type Time,
  createChart,
} from "lightweight-charts";
import {
  BarChart3,
  Camera,
  ChartCandlestick,
  ChevronDown,
  Crosshair,
  Eye,
  Grid3X3,
  Layers3,
  LineChart,
  Lock,
  Magnet,
  Maximize2,
  MousePointer2,
  PenLine,
  Redo2,
  Ruler,
  Settings2,
  Smile,
  Trash2,
  Undo2,
  User,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ChartInterval, MarketDataStatus, PricePoint } from "@/lib/market-data";
import { formatCompact, formatUsd, type Token } from "@/lib/tokens";

type ChartMetric = "price" | "mcap";
type QuoteCurrency = "usd" | "sol";
type ChartEngine = "chadwallet" | "geckoterminal" | "tradingview";
type ChartStyle = "candles" | "bars" | "line" | "area";
type ChartMenu = "interval" | "style" | "indicators" | null;
type PriceSeries =
  | ISeriesApi<"Candlestick">
  | ISeriesApi<"Bar">
  | ISeriesApi<"Line">
  | ISeriesApi<"Area">;

const visibleIntervals: Array<{ label: string; value?: ChartInterval }> = [
  { label: "1s" },
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1H" },
  { label: "4h", value: "4H" },
  { label: "D", value: "1D" },
];

const GECKO_FOOTER_TRIM_PX = 44;

const intervalMenuGroups: Array<{
  title: string;
  items: Array<{ label: string; value?: ChartInterval; favorite?: boolean }>;
}> = [
  {
    title: "Seconds",
    items: [
      { label: "1 second", favorite: true },
      { label: "15 seconds" },
      { label: "30 seconds" },
    ],
  },
  {
    title: "Minutes",
    items: [
      { label: "1 minute", value: "1m", favorite: true },
      { label: "5 minutes", value: "5m", favorite: true },
      { label: "15 minutes", value: "15m", favorite: true },
    ],
  },
  {
    title: "Hours",
    items: [
      { label: "1 hour", value: "1H", favorite: true },
      { label: "4 hours", value: "4H", favorite: true },
      { label: "1 day", value: "1D", favorite: true },
    ],
  },
];

const chartStyleOptions: Array<{
  label: string;
  value?: ChartStyle;
  icon: React.ReactNode;
  favorite?: boolean;
}> = [
  { label: "Bars", value: "bars", icon: <BarChart3 className="h-4 w-4" /> },
  {
    label: "Candles",
    value: "candles",
    icon: <ChartCandlestick className="h-4 w-4" />,
    favorite: true,
  },
  { label: "Hollow candles", icon: <ChartCandlestick className="h-4 w-4 opacity-55" /> },
  { label: "Line", value: "line", icon: <LineChart className="h-4 w-4" /> },
  { label: "Line with markers", icon: <LineChart className="h-4 w-4 opacity-55" /> },
  { label: "Area", value: "area", icon: <Layers3 className="h-4 w-4" /> },
];

const tradingViewSymbols: Record<string, string> = {
  SOL: "BINANCE:SOLUSDT",
  BONK: "BINANCE:1000BONKUSDT",
  WIF: "BINANCE:WIFUSDT",
  JUP: "BINANCE:JUPUSDT",
  PYTH: "BINANCE:PYTHUSDT",
  JTO: "BINANCE:JTOUSDT",
  POPCAT: "BINANCE:POPCATUSDT",
  PNUT: "BINANCE:PNUTUSDT",
};

export function PriceChart({
  data,
  dataStatus,
  provider,
  geckoPoolAddress,
  geckoTokenSide,
  geckoPoolName,
  geckoPoolDex,
  updatedAt,
  token,
  solPrice,
  interval,
  onIntervalChange,
}: {
  data: PricePoint[];
  dataStatus: MarketDataStatus;
  provider: "birdeye" | "geckoterminal" | "solana-rpc";
  geckoPoolAddress?: string;
  geckoTokenSide?: "base" | "quote";
  geckoPoolName?: string;
  geckoPoolDex?: string;
  updatedAt: string;
  token: Token;
  solPrice: number;
  interval: ChartInterval;
  onIntervalChange: (interval: ChartInterval) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<PriceSeries | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [metric, setMetric] = useState<ChartMetric>("price");
  const [quote, setQuote] = useState<QuoteCurrency>("usd");
  const [chartStyle, setChartStyle] = useState<ChartStyle>("candles");
  const [crosshairEnabled, setCrosshairEnabled] = useState(true);
  const [logScale, setLogScale] = useState(false);
  const [chartEngine, setChartEngine] = useState<ChartEngine>("chadwallet");
  const [activeMenu, setActiveMenu] = useState<ChartMenu>(null);
  const [showVolume, setShowVolume] = useState(true);
  const [showSma, setShowSma] = useState(false);
  const [showDevBuys, setShowDevBuys] = useState(false);
  const tradingViewSymbol = tradingViewSymbols[token.symbol.toUpperCase()];
  const chartEngineOptions: Array<[ChartEngine, string]> = [["chadwallet", "Live"]];
  if (geckoPoolAddress) chartEngineOptions.push(["geckoterminal", "Gecko"]);
  if (tradingViewSymbol) chartEngineOptions.push(["tradingview", "TradingView"]);

  const tokenSupply = token.price > 0 && token.marketCap > 0 ? token.marketCap / token.price : 0;
  const priceLabel = `${token.symbol}/${quote.toUpperCase()}`;
  const metricLabel = metric === "mcap" ? "Market Cap" : "Price";
  const exchangeLabel = quote === "usd" ? "USD" : "SOL";

  const { candles, lineData, volumes, latest, first } = useMemo(() => {
    let previousClose = data[0]?.value ?? 0;
    const transform = (value: number) => {
      const priced = metric === "mcap" && tokenSupply > 0 ? value * tokenSupply : value;
      return quote === "sol" && solPrice > 0 ? priced / solPrice : priced;
    };

    const seenTimes = new Set<Time>();
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
      .filter((point) => {
        const isValid = [point.open, point.high, point.low, point.close].every(Number.isFinite);
        if (!isValid) return false;
        if (seenTimes.has(point.time)) return false;
        seenTimes.add(point.time);
        return true;
      });

    const volumeData: HistogramData[] = candleData.map((candle) => {
      const point = data.find((p) => (p.time as Time) === candle.time);
      return {
        time: candle.time,
        value: point?.volume ?? 0,
        color:
          candle.close >= candle.open ? "rgba(20, 241, 149, 0.42)" : "rgba(255, 76, 104, 0.46)",
      };
    });
    const closeLineData: LineData[] = candleData.map((candle) => ({
      time: candle.time,
      value: candle.close,
    }));

    return {
      candles: candleData,
      lineData: closeLineData,
      volumes: volumeData,
      latest: candleData.at(-1),
      first: candleData[0],
    };
  }, [data, metric, quote, solPrice, tokenSupply]);

  const change = latest && first ? latest.close - first.open : 0;
  const changePct = latest && first && first.open > 0 ? (change / first.open) * 100 : 0;
  const up = change >= 0;
  const latestVolume = volumes.at(-1)?.value ?? 0;
  const providerLabel = marketProviderLabel(provider);
  const geckoEmbedUrl = useMemo(() => {
    if (!geckoPoolAddress) return "";

    const params = new URLSearchParams({
      embed: "1",
      info: "0",
      swaps: "1",
      light_chart: "0",
      chart_type: metric === "mcap" ? "market_cap" : "price",
      resolution: geckoResolution(interval),
      token: geckoTokenSide ?? "base",
      utm_source: "chadwallet",
    });

    return `https://www.geckoterminal.com/solana/pools/${encodeURIComponent(geckoPoolAddress)}?${params}`;
  }, [geckoPoolAddress, geckoTokenSide, interval, metric]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(245, 245, 255, 0.62)",
        fontFamily: "Aeonik, ui-sans-serif, system-ui, sans-serif",
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

    const priceSeries = createPriceSeries(chart, chartStyle);
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      borderVisible: false,
      scaleMargins: { top: 0.78, bottom: 0 },
    });

    chartRef.current = chart;
    priceSeriesRef.current = priceSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      priceSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [chartStyle]);

  useEffect(() => {
    chartRef.current?.applyOptions({
      localization: {
        priceFormatter: (price: number) => formatChartValue(price, metric, quote),
      },
    });
    if (chartStyle === "line" || chartStyle === "area") {
      (priceSeriesRef.current as ISeriesApi<"Line"> | ISeriesApi<"Area"> | null)?.setData(lineData);
    } else {
      (priceSeriesRef.current as ISeriesApi<"Candlestick"> | ISeriesApi<"Bar"> | null)?.setData(
        candles,
      );
    }
    volumeSeriesRef.current?.setData(showVolume ? volumes : []);
    chartRef.current?.timeScale().fitContent();
  }, [candles, chartStyle, lineData, metric, quote, showVolume, volumes]);

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

  useEffect(() => {
    if (chartEngine === "geckoterminal" && !geckoEmbedUrl) setChartEngine("chadwallet");
    if (chartEngine === "tradingview" && !tradingViewSymbol) setChartEngine("chadwallet");
  }, [chartEngine, geckoEmbedUrl, tradingViewSymbol]);

  if (geckoEmbedUrl) {
    return (
      <div className="relative h-full min-h-[300px] w-full overflow-hidden bg-transparent">
        <iframe
          key={geckoEmbedUrl}
          src={geckoEmbedUrl}
          title={`${token.symbol} market chart`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allow="clipboard-write; fullscreen"
          className="w-full border-0 bg-transparent"
          style={{ height: `calc(100% + ${GECKO_FOOTER_TRIM_PX}px)` }}
        />
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-[300px] w-full flex-col overflow-hidden bg-transparent">
      <div className="relative flex min-h-[38px] items-center gap-1.5 overflow-x-auto border-b border-[#1b1726]/40 bg-transparent px-3.5 py-1 text-xs no-scrollbar">
        <div className="flex items-center gap-0.5 pr-1">
          {visibleIntervals.map((item) => (
            <button
              key={item.label}
              onClick={() => item.value && onIntervalChange(item.value)}
              disabled={!item.value}
              title={item.value ? `${item.label} candles` : "Seconds feed coming soon"}
              className={`rounded-md px-1.5 py-1 font-mono text-[11px] transition ${
                item.value && interval === item.value
                  ? "text-[#a78bfa]"
                  : item.value
                    ? "text-[#9ca3af] hover:text-white"
                    : "cursor-not-allowed text-[#4f4a59]"
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === "interval" ? null : "interval")}
            className="grid h-6 w-6 place-items-center rounded-md text-[#8f879d] transition hover:bg-[#1b1726]/45 hover:text-white"
            title="More timeframes"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {activeMenu === "interval" && (
            <ChartDropdown className="left-3 top-9 w-[180px]">
              {intervalMenuGroups.map((group) => (
                <div key={group.title} className="border-b border-[#242033] py-1.5 last:border-b-0">
                  <div className="flex items-center justify-between px-3 pb-1 text-[10px] font-medium uppercase text-[#625c70]">
                    {group.title}
                    <ChevronDown className="h-3 w-3" />
                  </div>
                  {group.items.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      disabled={!item.value}
                      onClick={() => {
                        if (!item.value) return;
                        onIntervalChange(item.value);
                        setActiveMenu(null);
                      }}
                      className={`flex h-8 w-full items-center justify-between px-3 text-left text-[12px] transition ${
                        item.value
                          ? "text-[#d6d2de] hover:bg-[#2f65ff] hover:text-white"
                          : "cursor-not-allowed text-[#5c5669]"
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.favorite && <span className="text-[#ffbf2f]">★</span>}
                    </button>
                  ))}
                </div>
              ))}
            </ChartDropdown>
          )}
        </div>
        <Divider />
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === "style" ? null : "style")}
            className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-[#d6d2de] transition hover:bg-[#1b1726]/45 hover:text-white"
          >
            {chartStyleIcon(chartStyle)}
            {chartStyleLabel(chartStyle)}
            <ChevronDown className="h-3.5 w-3.5 text-[#625c70]" />
          </button>
          {activeMenu === "style" && (
            <ChartDropdown className="left-0 top-8 w-[210px]">
              {chartStyleOptions.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={!item.value}
                  onClick={() => {
                    if (!item.value) return;
                    setChartStyle(item.value);
                    setActiveMenu(null);
                  }}
                  className={`flex h-9 w-full items-center justify-between gap-3 px-3 text-left text-[12px] transition ${
                    index === 3 ? "border-t border-[#242033]" : ""
                  } ${
                    item.value
                      ? chartStyle === item.value
                        ? "bg-[#2f65ff] text-white"
                        : "text-[#d6d2de] hover:bg-[#1b1726]/70 hover:text-white"
                      : "cursor-not-allowed text-[#625c70]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {item.icon}
                    {item.label}
                  </span>
                  {item.favorite && <span className="text-[#ffbf2f]">★</span>}
                </button>
              ))}
            </ChartDropdown>
          )}
        </div>
        <Divider />
        <button
          type="button"
          onClick={() => setActiveMenu(activeMenu === "indicators" ? null : "indicators")}
          className="relative flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-[#d6d2de] transition hover:bg-[#1b1726]/45 hover:text-white"
        >
          <Grid3X3 className="h-3.5 w-3.5" />
          Indicators
          <ChevronDown className="h-3.5 w-3.5 text-[#625c70]" />
        </button>
        {activeMenu === "indicators" && (
          <ChartDropdown className="left-[310px] top-9 w-[210px]">
            <ChartToggle checked={showVolume} label="Volume" onChange={setShowVolume} />
            <ChartToggle checked={showSma} label="Volume SMA" onChange={setShowSma} />
            <ChartToggle checked={showDevBuys} label="Dev buys" onChange={setShowDevBuys} />
            <div className="border-t border-[#242033] px-3 py-2 text-[10px] text-[#625c70]">
              Drawing objects are local UI tools in this lightweight chart mode.
            </div>
          </ChartDropdown>
        )}
        <Divider />
        <InlinePair
          value={metric}
          left={["price", "Price"]}
          right={["mcap", "MCAP"]}
          onChange={setMetric}
        />
        <Divider />
        <InlinePair
          value={quote}
          left={["usd", "USD"]}
          right={["sol", "SOL"]}
          onChange={setQuote}
        />
        <Divider />
        <button
          type="button"
          onClick={() => setShowDevBuys((value) => !value)}
          className={`flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition ${
            showDevBuys ? "text-[#a78bfa]" : "text-[#d6d2de] hover:bg-[#1b1726]/45 hover:text-white"
          }`}
        >
          <User className="h-3.5 w-3.5" />
          Dev Buys
        </button>
        <Divider />
        {(geckoPoolAddress || tradingViewSymbol) && (
          <>
            <Segmented value={chartEngine} options={chartEngineOptions} onChange={setChartEngine} />
            <Divider />
          </>
        )}
        <div className="flex items-center gap-1 text-[#7a7488]">
          <ChartCandlestick className="h-3.5 w-3.5 text-[#20d772]" />
          Vol <span className="font-mono text-[#e8e4f0]">${formatCompact(latestVolume)}</span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1 text-[#625c70]">
          <ToolbarIcon label="Undo" disabled icon={<Undo2 className="h-3.5 w-3.5" />} />
          <ToolbarIcon label="Redo" disabled icon={<Redo2 className="h-3.5 w-3.5" />} />
          <ToolbarIcon
            label="Toggle crosshair"
            active={crosshairEnabled}
            onClick={() => setCrosshairEnabled((value) => !value)}
            icon={<Crosshair className="h-3.5 w-3.5" />}
          />
          <ToolbarIcon
            label="Fit"
            onClick={() => chartRef.current?.timeScale().fitContent()}
            icon={<Maximize2 className="h-3.5 w-3.5" />}
          />
          <ToolbarIcon label="Snapshot" icon={<Camera className="h-3.5 w-3.5" />} />
        </div>
        <div className="flex shrink-0 items-center gap-2 font-mono text-[10px]">
          <span className={dataStatus === "live" ? "text-[#20d772]" : "text-amber-400"}>
            {providerLabel} {dataStatus.toUpperCase()}
          </span>
          {geckoPoolName && (
            <span className="max-w-[160px] truncate text-[#7a7488]" title={geckoPoolName}>
              {geckoPoolDex ? `${geckoPoolDex} ` : ""}
              {geckoPoolName}
            </span>
          )}
          <span className="text-[#554f63]">{new Date(updatedAt).toLocaleTimeString()}</span>
        </div>
      </div>

      {chartEngine === "geckoterminal" && geckoEmbedUrl ? (
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <iframe
            key={geckoEmbedUrl}
            src={geckoEmbedUrl}
            title={`${token.symbol} market chart`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allow="clipboard-write; fullscreen"
            className="w-full border-0 bg-transparent"
            style={{ height: `calc(100% + ${GECKO_FOOTER_TRIM_PX}px)` }}
          />
        </div>
      ) : chartEngine === "tradingview" && tradingViewSymbol ? (
        <TradingViewAdvancedChart symbol={tradingViewSymbol} interval={interval} />
      ) : (
        <div className="relative min-h-0 flex-1">
          <div className="absolute left-0 top-0 z-10 flex h-full w-11 flex-col items-center border-r border-[#1b1726]/45 bg-transparent py-3 select-none">
            <ChartTool
              label="Cursor"
              active={crosshairEnabled}
              onClick={() => setCrosshairEnabled((value) => !value)}
              icon={<MousePointer2 className="h-4 w-4" />}
            />
            <ToolDivider />
            <ChartTool label="Crosshair" icon={<Crosshair className="h-4 w-4" />} />
            <ChartTool label="Trend line" icon={<PenLine className="h-4 w-4" />} />
            <ChartTool label="Fib / measure" icon={<Ruler className="h-4 w-4" />} />
            <ChartTool label="Magnet" icon={<Magnet className="h-4 w-4" />} />
            <ChartTool label="Lock drawings" icon={<Lock className="h-4 w-4" />} />
            <ChartTool label="Hide drawings" icon={<Eye className="h-4 w-4" />} />
            <ToolDivider />
            <ChartTool label="Remove drawings" icon={<Trash2 className="h-4 w-4" />} />
            <ChartTool label="Object tree" icon={<Layers3 className="h-4 w-4" />} />
            <ChartTool label="Emoji note" icon={<Smile className="h-4 w-4" />} />
            <div className="mt-auto">
              <ChartTool
                label="Log scale"
                active={logScale}
                onClick={() => setLogScale((value) => !value)}
                icon={<Settings2 className="h-4 w-4" />}
              />
            </div>
          </div>
          <div className="pointer-events-none absolute left-14 top-3 z-10 rounded-lg bg-[#08060f]/55 px-3 py-2 font-mono text-xs backdrop-blur">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-foreground">
                {priceLabel} ({metricLabel}) / {interval.replace("H", "h")}
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
          {showSma && (
            <div className="pointer-events-none absolute left-14 top-[72px] z-10 font-mono text-[11px] text-[#8f879d]">
              Volume SMA <span className="text-[#22c1d6]">${formatCompact(latestVolume)}</span>
            </div>
          )}
          {showDevBuys && (
            <div className="pointer-events-none absolute right-20 top-4 z-10 rounded-full border border-[#6d5dfc]/35 bg-[#6d5dfc]/12 px-2 py-1 text-[11px] font-medium text-[#b9a8ff]">
              Dev buys overlay on
            </div>
          )}
          <div ref={containerRef} className="h-full w-full pl-11" />
          <div className="absolute bottom-0 left-11 right-0 z-10 flex h-8 items-center justify-between border-t border-[#1b1726]/35 bg-[#08060f]/35 px-3 text-[12px] font-medium text-[#9ca3af] backdrop-blur">
            <div className="flex items-center gap-3">
              {["5y", "1y", "6m", "3m", "1m", "5d", "1d"].map((range) => (
                <button key={range} className="transition hover:text-white">
                  {range}
                </button>
              ))}
              <button className="rounded border border-[#1b1726]/70 px-1.5 py-0.5 text-[#7a7488] hover:text-white">
                ↔
              </button>
            </div>
            <div className="flex items-center gap-3 font-mono">
              <span>{new Date(updatedAt).toLocaleTimeString()} (UTC)</span>
              <button className="transition hover:text-white">%</button>
              <button
                onClick={() => setLogScale((value) => !value)}
                className={logScale ? "text-white" : "transition hover:text-white"}
              >
                log
              </button>
              <button
                onClick={() => chartRef.current?.timeScale().fitContent()}
                className="rounded bg-[#1b1726]/70 px-2 py-1 text-white"
              >
                auto
              </button>
            </div>
          </div>
          {!geckoPoolAddress && (
            <a
              href="https://www.tradingview.com/lightweight-charts/"
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-10 left-14 rounded bg-background/70 px-2 py-1 text-[10px] font-mono text-muted-foreground backdrop-blur hover:text-foreground"
            >
              TradingView Lightweight Charts
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function TradingViewAdvancedChart({
  symbol,
  interval,
}: {
  symbol: string;
  interval: ChartInterval;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.replaceChildren();
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget h-full w-full";
    const copyright = document.createElement("div");
    copyright.className =
      "tradingview-widget-copyright absolute bottom-1 left-2 z-10 text-[10px] text-muted-foreground";
    copyright.innerHTML =
      '<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank"><span>Advanced chart by TradingView</span></a>';
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.type = "text/javascript";
    script.text = JSON.stringify({
      autosize: true,
      symbol,
      interval: tradingViewInterval(interval),
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(0, 0, 0, 1)",
      gridColor: "rgba(255, 255, 255, 0.06)",
      allow_symbol_change: true,
      calendar: false,
      hide_side_toolbar: false,
      save_image: true,
      withdateranges: true,
      support_host: "https://www.tradingview.com",
    });

    container.append(widget, copyright, script);
    return () => container.replaceChildren();
  }, [interval, symbol]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container relative min-h-0 flex-1 overflow-hidden"
    />
  );
}

function createPriceSeries(chart: IChartApi, chartStyle: ChartStyle): PriceSeries {
  if (chartStyle === "bars") {
    return chart.addSeries(BarSeries, {
      upColor: "#14F195",
      downColor: "#FF4D68",
      thinBars: false,
      priceLineColor: "#8B5CF6",
      priceLineWidth: 1,
    });
  }

  if (chartStyle === "line") {
    return chart.addSeries(LineSeries, {
      color: "#22c1d6",
      lineWidth: 2,
      priceLineColor: "#8B5CF6",
      priceLineWidth: 1,
      lastValueVisible: true,
    });
  }

  if (chartStyle === "area") {
    return chart.addSeries(AreaSeries, {
      lineColor: "#22c1d6",
      topColor: "rgba(34, 193, 214, 0.28)",
      bottomColor: "rgba(34, 193, 214, 0.02)",
      lineWidth: 2,
      priceLineColor: "#8B5CF6",
      priceLineWidth: 1,
    });
  }

  return chart.addSeries(CandlestickSeries, {
    upColor: "#14F195",
    downColor: "#FF4D68",
    borderUpColor: "#14F195",
    borderDownColor: "#FF4D68",
    wickUpColor: "#14F195",
    wickDownColor: "#FF4D68",
    priceLineColor: "#8B5CF6",
    priceLineWidth: 1,
  });
}

function chartStyleLabel(style: ChartStyle) {
  return (
    {
      bars: "Bars",
      candles: "Candles",
      line: "Line",
      area: "Area",
    } satisfies Record<ChartStyle, string>
  )[style];
}

function chartStyleIcon(style: ChartStyle) {
  if (style === "bars") return <BarChart3 className="h-3.5 w-3.5" />;
  if (style === "line") return <LineChart className="h-3.5 w-3.5" />;
  if (style === "area") return <Layers3 className="h-3.5 w-3.5" />;
  return <ChartCandlestick className="h-3.5 w-3.5" />;
}

function tradingViewInterval(interval: ChartInterval) {
  return (
    {
      "1m": "1",
      "5m": "5",
      "15m": "15",
      "1H": "60",
      "4H": "240",
      "1D": "D",
    } as const
  )[interval];
}

function geckoResolution(interval: ChartInterval) {
  return (
    {
      "1m": "1m",
      "5m": "5m",
      "15m": "15m",
      "1H": "1h",
      "4H": "4h",
      "1D": "1d",
    } satisfies Record<ChartInterval, string>
  )[interval];
}

function marketProviderLabel(provider: "birdeye" | "geckoterminal" | "solana-rpc") {
  if (provider === "geckoterminal") return "MARKET";
  if (provider === "solana-rpc") return "Solana RPC";
  return "BirdEye";
}

function ChartDropdown({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <div
      className={`absolute z-40 overflow-hidden rounded-md border border-[#242033] bg-black/96 py-1 shadow-[0_18px_54px_rgba(0,0,0,0.68)] backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

function ChartToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex h-8 w-full items-center justify-between px-3 text-left text-[12px] text-[#d6d2de] transition hover:bg-[#1b1726]/70 hover:text-white"
    >
      <span>{label}</span>
      <span
        className={`h-4 w-7 rounded-full border transition ${
          checked ? "border-[#7c5cff] bg-[#7c5cff]" : "border-[#343044] bg-transparent"
        }`}
      >
        <span
          className={`block h-3 w-3 translate-y-[1px] rounded-full bg-white transition ${
            checked ? "translate-x-[13px]" : "translate-x-[1px]"
          }`}
        />
      </span>
    </button>
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
  onClick?: () => void;
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

function ToolbarIcon({
  label,
  icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-7 w-7 place-items-center rounded-md transition ${
        active
          ? "bg-[#1b1726]/70 text-white"
          : "text-[#625c70] hover:bg-[#1b1726]/45 hover:text-white"
      } disabled:cursor-not-allowed disabled:opacity-35`}
    >
      {icon}
    </button>
  );
}

function ToolDivider() {
  return <div className="my-1 h-px w-6 bg-[#1b1726]/70" />;
}

function Divider() {
  return <div className="h-4 w-px shrink-0 bg-[#1b1726]/60" />;
}

function InlinePair<T extends string>({
  value,
  left,
  right,
  onChange,
}: {
  value: T;
  left: [T, string];
  right: [T, string];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 text-[12px] font-medium">
      <button
        type="button"
        onClick={() => onChange(left[0])}
        className={value === left[0] ? "text-white" : "text-[#8f879d] hover:text-white"}
      >
        {left[1]}
      </button>
      <span className="text-[#554f63]">/</span>
      <button
        type="button"
        onClick={() => onChange(right[0])}
        className={value === right[0] ? "text-[#a78bfa]" : "text-[#8f879d] hover:text-white"}
      >
        {right[1]}
      </button>
    </div>
  );
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
    <div className="flex shrink-0 rounded-lg border border-[#1b1726]/50 bg-[#08060f]/60 p-0.5">
      {options.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`rounded-md px-2 py-1 font-mono text-[11px] transition ${
            value === key
              ? "bg-[#1b1726]/60 text-white font-semibold"
              : "text-[#7a7488] hover:text-white"
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

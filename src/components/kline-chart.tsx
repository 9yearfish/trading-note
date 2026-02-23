"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  createSeriesMarkers,
} from "lightweight-charts";
import type {
  IChartApi,
  CandlestickData,
  Time,
  SeriesMarker,
} from "lightweight-charts";
import { useTheme } from "next-themes";

interface KLineChartProps {
  data: Array<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
  volume?: Array<{
    time: string;
    value: number;
    color?: string;
  }>;
  markers?: Array<{
    time: string;
    position: "aboveBar" | "belowBar" | "inBar";
    color: string;
    shape?: "circle" | "square" | "arrowUp" | "arrowDown";
    text: string;
  }>;
  lines?: Array<{
    price: number;
    color: string;
    title?: string;
  }>;
  height?: number;
  barSpacing?: number;
}

export function KLineChart({
  data,
  volume,
  markers,
  lines,
  height = 400,
  barSpacing,
}: KLineChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const isDark = theme === "dark";

    const chart = createChart(chartContainerRef.current, {
      height,
      layout: {
        background: {
          type: ColorType.Solid,
          color: isDark ? "#0f0f0f" : "#ffffff",
        },
        textColor: isDark ? "#d1d5db" : "#374151",
      },
      grid: {
        vertLines: { color: isDark ? "#1f2937" : "#e5e7eb" },
        horzLines: { color: isDark ? "#1f2937" : "#e5e7eb" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: isDark ? "#374151" : "#d1d5db" },
      timeScale: {
        borderColor: isDark ? "#374151" : "#d1d5db",
        timeVisible: true,
      },
    });

    // v5 API: use chart.addSeries(CandlestickSeries, options)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      wickUpColor: "#22c55e",
    });

    const candleData: CandlestickData<Time>[] = data.map((d) => ({
      time: d.time as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candlestickSeries.setData(candleData);

    // v5 API: markers via createSeriesMarkers plugin
    if (markers && markers.length > 0) {
      const seriesMarkers: SeriesMarker<Time>[] = markers.map((m) => ({
        time: m.time as Time,
        position: m.position,
        color: m.color,
        shape: m.shape || "circle",
        text: m.text,
      }));
      createSeriesMarkers(candlestickSeries, seriesMarkers);
    }

    if (lines) {
      lines.forEach((line) => {
        candlestickSeries.createPriceLine({
          price: line.price,
          color: line.color,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: line.title || "",
        });
      });
    }

    // v5 API: use chart.addSeries(HistogramSeries, options)
    if (volume && volume.length > 0) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "",
      });
      chart.priceScale("").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeSeries.setData(
        volume.map((v) => ({
          time: v.time as Time,
          value: v.value,
          color: v.color || (isDark ? "#374151" : "#d1d5db"),
        }))
      );
    }

    chart.timeScale().fitContent();

    // When few data points, auto-limit bar width and center them
    const effectiveBarSpacing = barSpacing ?? (data.length <= 30 ? 20 : undefined);
    if (effectiveBarSpacing && chartContainerRef.current) {
      const chartWidth = chartContainerRef.current.clientWidth;
      const totalBarsWidth = data.length * effectiveBarSpacing;
      const emptySpace = chartWidth - totalBarsWidth;
      const rightOffsetBars = emptySpace > 0 ? emptySpace / (2 * effectiveBarSpacing) : 0;
      chart.timeScale().applyOptions({
        barSpacing: effectiveBarSpacing,
        rightOffset: rightOffsetBars,
      });
    }

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    chartRef.current = chart;

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, volume, markers, lines, height, theme, barSpacing]);

  return (
    <div
      ref={chartContainerRef}
      className="w-full rounded-lg border bg-card my-6"
    />
  );
}

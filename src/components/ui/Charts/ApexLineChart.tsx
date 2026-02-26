import { useEffect, useMemo, useRef } from "react";

type ApexLineChartSeries = {
  name: string;
  data: number[];
};

type ApexLineChartProps = {
  title: string;
  series: ApexLineChartSeries[];
  categories: string[];
  height?: number;
  color?: string;
};

type ApexChartInstance = {
  render: () => void;
  destroy: () => void;
};

type ApexChartCtor = new (
  el: HTMLElement,
  options: unknown
) => ApexChartInstance;

let apexChartsLoader: Promise<ApexChartCtor> | null = null;

const getApexChartsCtor = async (): Promise<ApexChartCtor> => {
  const apexFromWindow = (window as Window & { ApexCharts?: ApexChartCtor })
    .ApexCharts;
  if (apexFromWindow) {
    return apexFromWindow;
  }

  if (!apexChartsLoader) {
    apexChartsLoader = new Promise<ApexChartCtor>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/apexcharts";
      script.async = true;
      script.onload = () => {
        const ctor = (window as Window & { ApexCharts?: ApexChartCtor })
          .ApexCharts;
        if (!ctor) {
          reject(new Error("ApexCharts failed to initialize"));
          return;
        }
        resolve(ctor);
      };
      script.onerror = () => reject(new Error("Failed to load ApexCharts"));
      document.head.appendChild(script);
    });
  }

  return apexChartsLoader;
};

const ApexLineChart = ({
  title,
  series,
  categories,
  height = 220,
  color = "#38bdf8",
}: ApexLineChartProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ApexChartInstance | null>(null);

  const options = useMemo(() => {
    const labelStep =
      categories.length > 60
        ? 8
        : categories.length > 40
          ? 6
          : categories.length > 24
            ? 4
            : categories.length > 14
              ? 2
              : 1;
    const lastIndex = categories.length - 1;
    const tickAmount = Math.min(categories.length, 12);

    return {
      chart: {
        type: "area",
        height,
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: {
          enabled: true,
          easing: "easeinout",
          speed: 320,
        },
      },
      colors: [color],
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 3 },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 0.6,
          opacityFrom: 0.35,
          opacityTo: 0.05,
          stops: [0, 85, 100],
        },
      },
      grid: {
        borderColor: "rgba(148, 163, 184, 0.15)",
        strokeDashArray: 4,
        padding: {
          left: 8,
          right: 12,
          bottom: 8,
        },
      },
      xaxis: {
        categories,
        tickAmount,
        labels: {
          style: {
            colors: "#94a3b8",
            fontSize: "10px",
          },
          rotate: -90,
          rotateAlways: true,
          minHeight: 80,
          maxHeight: 120,
          offsetY: 2,
          hideOverlappingLabels: false,
          formatter: (value: string, rawIndex: number, index?: number) => {
            const resolvedIndex =
              typeof index === "number" && !Number.isNaN(index)
                ? index
                : Number(rawIndex);

            if (Number.isNaN(resolvedIndex)) {
              return value;
            }

            if (
              resolvedIndex === 0 ||
              resolvedIndex === lastIndex ||
              resolvedIndex % labelStep === 0
            ) {
              return value;
            }

            return "";
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: {
            colors: "#94a3b8",
            fontSize: "10px",
          },
        },
      },
      tooltip: { theme: "dark" },
      series,
    };
  }, [categories, color, height, series]);

  useEffect(() => {
    let isDisposed = false;

    const mountChart = async () => {
      const container = containerRef.current;
      if (!container) return;

      try {
        const ApexChartsCtor = await getApexChartsCtor();
        if (isDisposed || !containerRef.current) return;

        const chart = new ApexChartsCtor(container, options);
        chartRef.current = chart;
        chart.render();
      } catch (error) {
        console.error("[Chart] failed to render Apex chart", error);
      }
    };

    mountChart();

    return () => {
      isDisposed = true;
      const chart = chartRef.current;
      if (!chart) return;
      chart.destroy();
      chartRef.current = null;
    };
  }, [options]);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        {title}
      </p>
      <div
        ref={containerRef}
        className="mt-3 w-full"
        style={{ height }}
      />
    </div>
  );
};

export default ApexLineChart;

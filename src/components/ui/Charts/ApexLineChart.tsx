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

const ApexLineChart = ({
  title,
  series,
  categories,
  height = 220,
  color = "#38bdf8",
}: ApexLineChartProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<{ destroy: () => void } | null>(null);

  const options = useMemo(() => {
    const labelStep = 2;
    const lastIndex = categories.length - 1;

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
        },
      },
      xaxis: {
        categories,
        tickAmount: categories.length,
        labels: {
          style: {
            colors: "#94a3b8",
            fontSize: "10px",
          },
          rotate: -35,
          offsetY: 4,
          hideOverlappingLabels: true,
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
    const ApexChartsCtor = (window as typeof window & {
      ApexCharts?: new (el: HTMLElement, options: unknown) => {
        render: () => void;
        destroy: () => void;
      };
    }).ApexCharts;

    const container = containerRef.current;
    if (!ApexChartsCtor || !container) {
      return undefined;
    }

    const chart = new ApexChartsCtor(container, options);
    chartRef.current = chart;
    chart.render();

    return () => {
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

<script lang="ts">
  import { ArcElement, Chart, Legend, PieController, Tooltip } from "chart.js";
  import { onDestroy, onMount } from "svelte";

  // Register Chart.js components
  Chart.register(PieController, ArcElement, Tooltip, Legend);

  export let labels: string[] = [];
  export let data: number[] = [];
  export let backgroundColors: string[] = [
    "rgba(255, 99, 132, 0.7)",
    "rgba(54, 162, 235, 0.7)",
    "rgba(255, 206, 86, 0.7)",
    "rgba(75, 192, 192, 0.7)",
    "rgba(153, 102, 255, 0.7)",
  ];

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;
  let isDesktop: boolean = false;

  function updateIsDesktop() {
    isDesktop = window.innerWidth >= 768;
  }

  function createChart() {
    if (!canvas) return;

    // Destroy existing chart if it exists
    if (chart) {
      chart.destroy();
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate total for percentages
    const total = data.reduce((a, b) => a + b, 0);

    chart = new Chart(ctx, {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: backgroundColors,
            borderColor: backgroundColors.map((color) =>
              color.replace("0.7", "1"),
            ),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: isDesktop ? { right: 20 } : { bottom: 10 },
        },
        plugins: {
          legend: {
            position: isDesktop ? "right" : "bottom",
            labels: {
              padding: 15,
              font: {
                size: 12,
              },
              generateLabels: function (chart) {
                const datasets = chart.data.datasets;
                const labelsList = chart.data.labels as string[];
                return labelsList.map((label, i) => {
                  const value = datasets[0].data[i] as number;
                  const percentage =
                    total > 0 ? ((value / total) * 100).toFixed(1) : "0";
                  return {
                    text: `${label}: ${percentage}%`,
                    fillStyle: backgroundColors[i],
                    strokeStyle: backgroundColors[i].replace("0.7", "1"),
                    lineWidth: 1,
                    hidden: false,
                    index: i,
                  };
                });
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.parsed || 0;
                const dataTotal = context.dataset.data.reduce(
                  (a: number, b: number) => a + b,
                  0,
                );
                const percentage = ((value / dataTotal) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }

  onMount(() => {
    updateIsDesktop();
    window.addEventListener("resize", handleResize);
    createChart();
  });

  onDestroy(() => {
    window.removeEventListener("resize", handleResize);
    if (chart) {
      chart.destroy();
    }
  });

  function handleResize() {
    const wasDesktop = isDesktop;
    updateIsDesktop();
    if (wasDesktop !== isDesktop) {
      createChart();
    }
  }

  // Recreate chart when data changes
  $: if (canvas && (labels || data)) {
    createChart();
  }
</script>

<div class="chart-wrapper">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .chart-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
  }

  canvas {
    max-width: 100%;
    max-height: 100%;
  }
</style>

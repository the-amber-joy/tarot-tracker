<script lang="ts">
  import { ArcElement, Chart, Legend, PieController, Tooltip } from "chart.js";
  import { onDestroy, onMount } from "svelte";

  // Register Chart.js components
  Chart.register(PieController, ArcElement, Tooltip, Legend);

  export let labels: string[] = [];
  export let data: number[] = [];
  export let title: string = "";
  export let backgroundColors: string[] = [
    "rgba(255, 99, 132, 0.7)",
    "rgba(54, 162, 235, 0.7)",
    "rgba(255, 206, 86, 0.7)",
    "rgba(75, 192, 192, 0.7)",
    "rgba(153, 102, 255, 0.7)",
  ];

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  function createChart() {
    if (!canvas) return;

    // Destroy existing chart if it exists
    if (chart) {
      chart.destroy();
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    chart = new Chart(ctx, {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            label: title,
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
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 15,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce(
                  (a: number, b: number) => a + b,
                  0,
                );
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }

  onMount(() => {
    createChart();
  });

  onDestroy(() => {
    if (chart) {
      chart.destroy();
    }
  });

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

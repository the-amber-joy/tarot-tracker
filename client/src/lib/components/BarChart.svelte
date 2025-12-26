<script lang="ts">
  import {
    BarController,
    BarElement,
    CategoryScale,
    Chart,
    Legend,
    LinearScale,
    Title,
    Tooltip,
  } from "chart.js";
  import { onDestroy, onMount } from "svelte";

  // Register Chart.js components
  Chart.register(
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    Title,
    Tooltip,
    Legend,
  );

  export let labels: string[] = [];
  export let data: number[] = [];
  export let title: string = "";
  export let horizontal: boolean = true;
  export let backgroundColor: string | string[] = "rgba(123, 44, 191, 0.7)";
  export let borderColor: string | string[] = "rgba(123, 44, 191, 1)";

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  // Generate array of colors if a single color is provided
  $: backgroundColors = Array.isArray(backgroundColor)
    ? backgroundColor
    : Array(data.length).fill(backgroundColor);

  $: borderColors = Array.isArray(borderColor)
    ? borderColor
    : Array(data.length).fill(borderColor);

  function createChart() {
    if (!canvas) return;

    // Destroy existing chart if it exists
    if (chart) {
      chart.destroy();
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: title,
            data,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1,
          },
        ],
      },
      options: {
        indexAxis: horizontal ? "y" : "x",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: false,
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
          y: {
            beginAtZero: true,
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

  // Recreate chart when data or orientation changes
  $: if (canvas && (labels || data || horizontal !== undefined)) {
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

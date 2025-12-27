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
  export let datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
  }> = [];
  export let horizontal: boolean = true;

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
      type: "bar",
      data: {
        labels,
        datasets,
      },
      options: {
        indexAxis: horizontal ? "y" : "x",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              padding: 15,
              font: {
                size: 12,
              },
            },
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
  $: if (canvas && (labels || datasets || horizontal !== undefined)) {
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

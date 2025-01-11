<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { promisesStore, proofsStore } from '../../stores';

	let chartElem = $state();
	let chart: ApexCharts;
	const groupByAndSum = (data: [number, number][], seconds = 2000) => {
		return data.reduce(
			(prev, curr) => {
				const clone = [...prev];
				if (!clone.length) {
					clone.push(curr);
				} else {
					if (clone[clone.length - 1][0] + seconds < curr[0]) {
						clone.push(curr);
					} else {
						clone[clone.length - 1][1] += curr[1];
					}
				}
				return clone;
			},
			[] as [number, number][]
		);
	};

	let options = $derived({
		theme: {
      mode: 'dark', 
      palette: 'palette1', 
      monochrome: {
          enabled: false,
          color: '#255aee',
          shadeTo: 'light',
          shadeIntensity: 0.65
      },
  },
		tooltip: {
      enabled: true,
      enabledOnSeries: undefined,
      followCursor: false,
      custom: undefined,
      hideEmptySeries: true,
      fillSeriesColor: false,
      theme: true,
      style: {
        fontSize: '12px',
        fontFamily: undefined,
      },
      onDatasetHover: {
          highlightDataSeries: false,
      },
      x: {
          show: true,
          formatter: function (value: number) {
					return new Date(value * 1000).toLocaleTimeString(); // The formatter function overrides format property
},
      },
      y: {
          formatter: undefined,
          title: {
              formatter: (seriesName) => seriesName,
          },
      },
  },
		grid: {
			row: {
			},
			column: {
			},
			xaxis: {
				lines: {
					show: false
				}
			},
			yaxis: {
				lines: {
					show: false
				}
			}
		},
		
		chart: {
			type: 'bar',
			height: 500
		},
		xaxis: {
			labels: {
				formatter: function (value: number, timestamp: number) {
					return new Date(timestamp * 1000).toLocaleTimeString(); // The formatter function overrides format property
				}
			}
		},
		series: [
		
			{
				data: groupByAndSum($promisesStore.map((p) => [p.createdAt, p.amount])),
				name: 'Promises'
			},
			{
				data: groupByAndSum($proofsStore.map((p) => [p.createdAt, p.amount])),
				name: 'Proofs'
			},
		]
	});
	$effect(() => {
		console.log(options);
		if (chart) {
			chart.updateOptions(options);
		}
	});

	onMount(async () => {
		if (browser) {
			const ApexCharts = (await import('apexcharts')).default;
			chart = new ApexCharts(chartElem, options);
			chart.render();
		}
	});
</script>

<div class="w-full">
	<div bind:this={chartElem} class="w-full"></div>
</div>

<style>
</style>

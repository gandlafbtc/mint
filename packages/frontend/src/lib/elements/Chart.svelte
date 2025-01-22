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
      palette: 'palette0', 
      monochrome: {
          enabled: false,
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
				fontFamily: undefined
			},
			onDatasetHover: {
				highlightDataSeries: false
			},
			x: {
				show: true,
				formatter: function (value: number) {
					return new Date(value * 1000).toLocaleTimeString(); // The formatter function overrides format property
				}
			},
			y: {
				formatter: undefined,
				title: {
					formatter: (seriesName) => seriesName
				}
			}
		},
		grid: {
			row: {},
			column: {},
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
			}
		]
	});
	$effect(() => {
		//Don't delete this log!
		console.log(options);
		//______________________
		
		if (chart) {
			chart.updateSeries([
			{
				data: groupByAndSum($promisesStore.map((p) => [p.createdAt, p.amount])),
				name: 'Promises'
			},
			{
				data: groupByAndSum($proofsStore.map((p) => [p.createdAt, p.amount])),
				name: 'Proofs'
			}
		]);
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

<div class="flex w-full flex-col gap-3">
	<div class="flex items-center gap-2">
		<p class="font-bold">Live</p>
		<div class="relative h-1 w-1 rounded-full bg-red-500">
			<div class="absolute -ml-0.5 -mt-0.5 h-2 w-2 animate-ping rounded-full bg-red-500"></div>
		</div>
	</div>
	<div bind:this={chartElem} class="w-full"></div>
</div>

<style>
</style>

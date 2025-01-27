<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	interface Props {
		seriesName: string;
		seriesValues: [number, number][];
	}

	let { seriesName, seriesValues }: Props = $props();

	let chartElem = $state();
	let chart: ApexCharts;

	let options = $derived({
		theme: {
			mode: 'dark',
			palette: 'palette0',
			monochrome: {
				enabled: false,
				shadeTo: 'light',
				shadeIntensity: 0.65
			}
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
					formatter: (sn: string) => sn
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
			type: 'line',
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
				data: seriesValues,
				name: seriesName
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
					data: seriesValues,
					name: seriesName
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

<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let chartElem = $state();
	var options = {
		chart: {
			type: 'line'
		},
		series: [
			{
				name: 'sales',
				data: [30, 40, 35, 50, 49, 60, 70, 91, 125]
			}
		],
		xaxis: {
			categories: [1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999]
		}
	};
	onMount(async ()=> {
        if (browser) {
            const ApexCharts = (await import('apexcharts')).default;
            let chart = new ApexCharts(chartElem, options);
            chart.render();
        }
    })
</script>

<div class="w-96 h-96">

    <div bind:this={chartElem} class="h-92 w-92"></div>
</div>
    
    <style>
</style>

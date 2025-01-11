<script lang="ts">
	import { LoaderCircle, Plus } from 'lucide-svelte';
	import { dashboardData, keysets } from '../../stores';
	import NumberFlow from '@number-flow/svelte';
	import Chart from './Chart.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
</script>

<div class="grid h-full w-full grid-cols-3 gap-2">
	<div class="bg-secondary flex h-52 flex-col rounded-lg p-2">
		<div class="flex items-center justify-between gap-2">
			<p class="font-bold">Keysets</p>
			<Button onclick={() => keysets.createKeyset({})}>
				<Plus></Plus>
			</Button>
		</div>
		{#if $keysets}
			<!-- {JSON.stringify($keysets)} -->
			<div class="grid h-full grid-cols-3 items-center gap-2">
				<div class="flex flex-col items-center justify-center gap-2">
					<p class="">Total</p>
					<p class="text-3xl font-bold">
						<NumberFlow value={$keysets.length}></NumberFlow>
					</p>
				</div>
				<div class="flex flex-col items-center justify-center gap-2 text-green-500">
					<p class="">Active</p>
					<p class="text-3xl font-bold">
						<NumberFlow value={$keysets.filter((ks) => ks.isActive).length}></NumberFlow>
					</p>
				</div>
				<div class="flex flex-col items-center justify-center gap-2 text-yellow-500">
					<p class="">Inactive</p>
					<p class="text-3xl font-bold">
						<NumberFlow value={$keysets.filter((ks) => !ks.isActive).length}></NumberFlow>
					</p>
				</div>
			</div>
		{:else}
			<LoaderCircle class="animate-spin"></LoaderCircle>
		{/if}
	</div>
	<div class="bg-secondary h-52 rounded-lg p-2 flex flex-col justify-between">
		<div class="flex items-center justify-between gap-2">
			<p class="font-bold">Promises and Proofs</p>
		</div>
		{#if $dashboardData}
			<!-- {JSON.stringify($keysets)} -->
			<div class="grid  justify-center grid-cols-5 items-center gap-2 bg-background rounded-lg h-40">
				<div class="flex flex-col items-center justify-center gap-2 text-green-500">
					<p class="">Proofs</p>
					<p class="text-3xl font-bold">
						<NumberFlow value={$dashboardData.proofsCount.reduce((prev, curr)=> curr.count+prev,0)}></NumberFlow>
					</p>
				</div>
				<div class=" flex flex-col col-span-3 items-center justify-center gap-2">
                <Progress value={($dashboardData.proofsCount.reduce((prev, curr)=> curr.count+prev,0)/$dashboardData.promisesCount.reduce((prev, curr)=> curr.count+prev,0))*100} />
				</div>
				<div class=" flex flex-col items-center justify-center gap-2 text-sky-500">
					<p class="">Promises</p>
					<p class="text-3xl font-bold">
						<NumberFlow value={$dashboardData.promisesCount.reduce((prev, curr)=> curr.count+prev,0)}></NumberFlow>
					</p>
				</div>
			</div>
		{:else}
			<LoaderCircle class="animate-spin"></LoaderCircle>
		{/if}
	</div>
    	<div class="bg-secondary h-52 rounded-lg p-2 flex flex-col justify-between">
            <div class="flex items-center justify-between gap-2">
                <p class="font-bold">Promises and Proofs (amount)</p>
            </div>
            {#if $dashboardData}
                <!-- {JSON.stringify($keysets)} -->
                <div class="grid  justify-center grid-cols-4 items-center gap-2 bg-background rounded-lg h-40">
                    <div class="flex flex-col items-center justify-center gap-2 text-green-500">
                        <p class="">Proofs</p>
                        <p class="text-3xl font-bold">
                            <NumberFlow format={{ notation: 'compact',maximumFractionDigits:1,minimumFractionDigits:0 }} value={$dashboardData.totalProofs.reduce((prev, curr)=> parseInt(curr.sum)+prev,0)}></NumberFlow>
                            <span class="text-xs">
                                sat
                            </span>
                        </p>
                        
                    </div>
                    <div class=" flex flex-col col-span-2 items-center justify-center gap-2">
                    <Progress value={($dashboardData.totalProofs.reduce((prev, curr)=> parseInt(curr.sum)+prev,0)/$dashboardData.totalPromises.reduce((prev, curr)=> parseInt(curr.sum)+prev,0))*100} />
                    </div>
                    <div class=" flex flex-col items-center justify-center gap-2 text-sky-500">
                        <p class="">Promises</p>
                        <p class="text-3xl font-bold">
                            <NumberFlow format={{ notation: 'compact', maximumFractionDigits:1 ,minimumFractionDigits:0  }} value={$dashboardData.totalPromises.reduce((prev, curr)=> parseInt(curr.sum)+prev,0)}></NumberFlow>
                            <span class="text-xs">
                                sat
                            </span>
                        </p>
                    </div>
                </div>
            {:else}
                <LoaderCircle class="animate-spin"></LoaderCircle>
            {/if}
        </div>
	<div class="bg-secondary col-span-3 h-[40rem] rounded-lg p-2">
		<Chart></Chart>
	</div>
</div>

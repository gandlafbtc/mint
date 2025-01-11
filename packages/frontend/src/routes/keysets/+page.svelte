<script lang="ts">
	import NumberFlow from '@number-flow/svelte';

	import { dashboardData, keysets } from '../../stores';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import { LoaderCircle } from 'lucide-svelte';
	import ProgressSuccess from '$lib/components/ui/progress/progressSuccess.svelte';
	
</script>

<div class="m-2 flex flex-col gap-2">
	<p class="font-bold">Keysets</p>

	{#if $dashboardData && $keysets}
		<div class="flex flex-col gap-2">
			{#each $keysets as ks, i}
				{@const proofsCount = $dashboardData.proofsCount.find((c) => c.id === ks.hash)?.count ?? 0}
				{@const totalProofs = parseInt(
					$dashboardData.totalProofs.find((c) => c.id === ks.hash)?.sum ?? '0'
				)}
				{@const promisesCount =
					$dashboardData.promisesCount.find((c) => c.id === ks.hash)?.count ?? 0}
				{@const totalPromises = parseInt(
					$dashboardData.totalPromises.find((c) => c.id === ks.hash)?.sum ?? '0'
				)}
				<div
					class="bg-secondary flex flex-col gap-2 rounded-xl p-4 {ks.isActive
						? 'order-1 border border-green-500'
						: ` order-2`} "
				>
					<div class="">
						<p class="flex items-baseline gap-1">
							<span class="font-bold"> ID: </span>
							<span class="text-sm">
								{ks.hash}
							</span>
							{#if ks.isActive}
								<span class="text-xs text-green-500"> Active </span>
							{/if}
						</p>
					</div>
					<div
						class="bg-background grid h-40 grid-cols-4 items-center justify-center gap-2 rounded-lg"
					>
						<div class="flex flex-col items-center justify-center gap-2 text-green-500">
							<p class="">Proofs</p>
							<p class="text-3xl font-bold">
								<NumberFlow
									format={{
										notation: 'compact',
										maximumFractionDigits: 1,
										minimumFractionDigits: 0
									}}
									value={proofsCount}
								></NumberFlow>
							</p>
							<p class="text-3xl font-bold">
								<NumberFlow
									format={{
										notation: 'compact',
										maximumFractionDigits: 1,
										minimumFractionDigits: 0
									}}
									value={totalProofs}
								></NumberFlow>
								<span class="text-xs"> sat </span>
							</p>
						</div>
						<div class=" col-span-2 flex flex-col items-center justify-end gap-2 h-full pb-6">
                            {Math.floor((proofsCount / promisesCount) * 100) } %
							<ProgressSuccess class='bg-sky-500 bg-opacity-60' value={Math.floor((proofsCount / promisesCount) * 100)} />
                            {Math.floor((totalProofs / totalPromises) * 100)} %
							<ProgressSuccess class='bg-sky-500 bg-opacity-60' value={Math.floor((totalProofs / totalPromises) * 100)} />
						</div>
						<div class=" flex flex-col items-center justify-center gap-2 text-sky-500">
							<p class="">Promises</p>
							<p class="text-3xl font-bold">
								<NumberFlow
									format={{
										notation: 'compact',
										maximumFractionDigits: 1,
										minimumFractionDigits: 0
									}}
									value={promisesCount}
								></NumberFlow>
							</p>
							<p class="text-3xl font-bold">
								<NumberFlow
									format={{
										notation: 'compact',
										maximumFractionDigits: 1,
										minimumFractionDigits: 0
									}}
									value={totalPromises}
								></NumberFlow>
								<span class="text-xs"> sat </span>
							</p>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<LoaderCircle class="animate-spin"></LoaderCircle>
	{/if}
</div>

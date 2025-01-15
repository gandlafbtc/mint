<script lang="ts">
	import { LoaderCircle, Plus } from 'lucide-svelte';
	import { dashboardData, keysets, pingStore } from '../../stores';
	import NumberFlow from '@number-flow/svelte';
	import Chart from './Chart.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import ProgressSuccess from '$lib/components/ui/progress/progressSuccess.svelte';
	import BackendConnectionIndicator from './BackendConnectionIndicator.svelte';
</script>

<div class="flex flex-col gap-2">
	<div class="flex h-full w-full flex-col gap-2 xl:flex-row">
		<div class="bg-secondary flex h-52 flex-col rounded-lg p-2">
			<div class="flex items-center justify-between gap-2">
				<p class="font-bold">Keysets</p>
				<Button onclick={() => keysets.createKeyset({})}>
					<Plus></Plus>
				</Button>
			</div>
			{#if $keysets}
				<!-- {JSON.stringify($keysets)} -->
				<div class="grid h-full min-w-64 grid-cols-3 items-center gap-12">
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
		{#if $dashboardData}
			{@const proofsCount = $dashboardData.proofsCount.reduce((prev, curr) => curr.count + prev, 0)}
			{@const promisesCount = $dashboardData.promisesCount.reduce(
				(prev, curr) => curr.count + prev,
				0
			)}
			{@const totalProofs = $dashboardData.totalProofs.reduce(
				(prev, curr) => parseInt(curr.sum) + prev,
				0
			)}
			{@const totalPromises = $dashboardData.totalPromises.reduce(
				(prev, curr) => parseInt(curr.sum) + prev,
				0
			)}
			{@const lnBalance = $pingStore?.backendConnection.lnBalance?.outbound ?? 0}
			{@const lnInbound = $pingStore?.backendConnection.lnBalance?.inbound ?? 0}
			{@const onChain = $pingStore?.backendConnection.onchainBalance?.confirmed ?? 0}
			<div class="bg-secondary flex h-52 w-full flex-col justify-between rounded-lg p-2">
				<div class="flex items-center justify-between gap-2">
					<p class="font-bold">Promises and Proofs</p>
				</div>
				<!-- {JSON.stringify($keysets)} -->
				<div
					class="bg-background grid h-40 grid-cols-5 items-center justify-center gap-2 rounded-lg"
				>
					<div class="flex flex-col items-center justify-center gap-2 text-green-500">
						<p class="">Proofs</p>
						<p class="text-3xl font-bold">
							<NumberFlow value={proofsCount}></NumberFlow>
						</p>
						<p class="text-3xl font-bold">
							<NumberFlow
								format={{ notation: 'compact', maximumFractionDigits: 1, minimumFractionDigits: 0 }}
								value={totalProofs}
							></NumberFlow>
							<span class="text-xs"> sat </span>
						</p>
					</div>
					<div class=" col-span-3 mb-12 flex h-full flex-col items-center justify-end gap-2">
						<p class="text-sky-500">
							<NumberFlow
								format={{
									notation: 'compact',
									maximumFractionDigits: 1,
									minimumFractionDigits: 0
								}}
								value={promisesCount - proofsCount}
							></NumberFlow> ({Math.floor((proofsCount / promisesCount) * 100)} %) Unredeemed
						</p>
						<ProgressSuccess class="bg-sky-500" value={(proofsCount / promisesCount) * 100} />
						<p class="text-sky-500">
							<NumberFlow
								format={{
									notation: 'compact',
									maximumFractionDigits: 1,
									minimumFractionDigits: 0
								}}
								value={totalPromises - totalProofs}
							></NumberFlow> sat ({Math.floor((totalProofs / totalPromises) * 100)} %) Unredeemed
						</p>
						<ProgressSuccess class="bg-sky-500" value={(totalProofs / totalPromises) * 100} />
					</div>
					<div class=" flex flex-col items-center justify-center gap-2 text-sky-500">
						<p class="">Promises</p>
						<p class="text-3xl font-bold">
							<NumberFlow value={promisesCount}></NumberFlow>
						</p>
						<p class="text-3xl font-bold">
							<NumberFlow
								format={{ notation: 'compact', maximumFractionDigits: 1, minimumFractionDigits: 0 }}
								value={totalPromises}
							></NumberFlow>
							<span class="text-xs"> sat </span>
						</p>
					</div>
				</div>
			</div>
			<div class="bg-secondary flex w-full flex-col justify-between rounded-lg p-2 lg:h-52">
				<div class="flex items-center justify-between gap-2">
					<p class="font-bold">Lightning</p>
					<BackendConnectionIndicator></BackendConnectionIndicator>
				</div>

				<div class="flex flex-col gap-2 lg:flex-row">
					<div class="bg-background flex h-40 w-full min-w-44 flex-col gap-2 rounded-lg">
						<p class="m-2 text-sm font-bold">Channel liquidity</p>
						<div class=" grid h-full grid-cols-2 items-center justify-center gap-2">
							<div class="flex flex-col items-center justify-center gap-2 text-green-500">
								<p class="">Outbound</p>
								<p class="text-3xl font-bold">
									<NumberFlow
										format={{
											notation: 'compact',
											maximumFractionDigits: 1,
											minimumFractionDigits: 0
										}}
										value={lnBalance}
									></NumberFlow>
								</p>
							</div>

							<div class=" flex flex-col items-center justify-center gap-2 text-yellow-400">
								<p class="">Inbound</p>

								<p class="text-3xl font-bold">
									<NumberFlow
										format={{
											notation: 'compact',
											maximumFractionDigits: 1,
											minimumFractionDigits: 0
										}}
										value={lnInbound}
									></NumberFlow>
									<span class="text-xs"> sat </span>
								</p>
							</div>
							<div class=" col-span-2 m-2 flex flex-col items-center justify-center gap-2">
								<ProgressSuccess class="bg-yellow-400" value={(lnBalance / lnInbound) * 100} />
							</div>
						</div>
					</div>
					<div class="flex gap-2">
						<div class="bg-background flex h-40 w-44 flex-col rounded-lg">
							<p class="m-2 text-sm font-bold">Onchain</p>
							<div class="flex h-full w-full items-center justify-center">
								<p class="text-3xl font-bold text-orange-500">
									<NumberFlow
										format={{
											notation: 'compact',
											maximumFractionDigits: 1,
											minimumFractionDigits: 0
										}}
										value={onChain}
									></NumberFlow>
									<span class="text-xs"> sat </span>
								</p>
							</div>
						</div>

						<div class="bg-background flex h-40 w-44 flex-col rounded-lg">
							<p class="m-2 text-sm font-bold">Coverage</p>
							<div class="flex h-full w-full items-center justify-center">
								<p class="text-3xl font-bold">
									<NumberFlow
										format={{
											notation: 'compact',
											maximumFractionDigits: 1,
											minimumFractionDigits: 0
										}}
										value={(lnBalance / (totalPromises - totalProofs)) * 100}
									></NumberFlow>
									<span class="text-xs"> % </span>
								</p>
							</div>
						</div>
					</div>
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

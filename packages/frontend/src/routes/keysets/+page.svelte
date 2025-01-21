<script lang="ts">
	import NumberFlow from '@number-flow/svelte';
	import { Switch } from '$lib/components/ui/switch';
	import { dashboardData, keysets } from '../../stores';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import { LoaderCircle, Plus } from 'lucide-svelte';
	import ProgressSuccess from '$lib/components/ui/progress/progressSuccess.svelte';
	import type { Keyset } from '@mnt/common/db/types';
	import Button from '$lib/components/ui/button/button.svelte';
	import { toast } from 'svelte-sonner';
	import { ensureError } from '../../errors';

	const updateAllowMint = async (ks: Keyset) => {
		const ksClone = {...ks}
		ksClone.allowMint = !ksClone.allowMint
		keysets.updateKeyset(ksClone)
	}
	const updateAllowMelt = async (ks: Keyset) => {
		const ksClone = {...ks}
		ksClone.allowMelt = !ksClone.allowMelt
		keysets.updateKeyset(ksClone)
	};
	const updateAllowSwapOut = async (ks: Keyset) => {
		const ksClone = {...ks}
		ksClone.allowSwapOut = !ksClone.allowSwapOut
		keysets.updateKeyset(ksClone)
	};
	const updateAllowSwapIn = async (ks: Keyset) => {
		const ksClone = {...ks}
		ksClone.allowSwapIn = !ksClone.allowSwapIn
		keysets.updateKeyset(ksClone)
	};

    let isLoading = $state(false)

    const addKeyset = async () => {
        try {
            isLoading=true

            // create keyset
            await keysets.createKeyset({unit: 'sat'})
            toast.success('New Keyset created')
        }catch (error) {
			console.error(error);
			const err = ensureError(error);
			toast.error(err.message);
		} finally {
			isLoading = false;
		}
    }
</script>

<div class="m-2 flex flex-col gap-2">
	<p class="font-bold">Keysets</p>
	<Button onclick={addKeyset}>
		<Plus></Plus> New Keyset
	</Button>
	{#if $dashboardData && $keysets}
		<div class="flex flex-col gap-2">
			{#each $keysets as ks}
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

					<div class="flex flex-col gap-2 lg:flex-row">
						<div
							class="bg-background flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg"
						>
							<div class="grid grid-cols-2 items-center gap-2">
								<div class="flex items-center gap-2">
									{#if ks.allowMint}
										<div class="relative h-1 w-1 rounded-full bg-green-500">
											<div
												class="absolute -ml-0.5 -mt-0.5 h-2 w-2 animate-ping rounded-full bg-green-500"
											></div>
										</div>
									{:else}
										<div class="flex items-center gap-2">
											<div class="relative h-1 w-1 rounded-full bg-red-500"></div>
										</div>
									{/if}
									<p>Deposit</p>
								</div>
								<Switch checked={ks.allowMint ?? false} onclick={() => updateAllowMint(ks)} />
								<div class="flex items-center gap-2">
									{#if ks.allowMelt}
										<div class="relative h-1 w-1 rounded-full bg-green-500">
											<div
												class="absolute -ml-0.5 -mt-0.5 h-2 w-2 animate-ping rounded-full bg-green-500"
											></div>
										</div>
									{:else}
										<div class="flex items-center gap-2">
											<div class="relative h-1 w-1 rounded-full bg-red-500"></div>
										</div>
									{/if}
									<p>Withdraw</p>
								</div>
								<Switch checked={ks.allowMelt ?? false} onclick={() => updateAllowMelt(ks)} />
								<div class="flex items-center gap-2">
									{#if ks.allowSwapIn}
										<div class="relative h-1 w-1 rounded-full bg-green-500">
											<div
												class="absolute -ml-0.5 -mt-0.5 h-2 w-2 animate-ping rounded-full bg-green-500"
											></div>
										</div>
									{:else}
										<div class="flex items-center gap-2">
											<div class="relative h-1 w-1 rounded-full bg-red-500"></div>
										</div>
									{/if}
									<p>Swap in</p>
								</div>
								<Switch checked={ks.allowSwapIn ?? false} onclick={() => updateAllowSwapIn(ks)} />
								<div class="flex items-center gap-2">
									{#if ks.allowSwapOut}
										<div class="relative h-1 w-1 rounded-full bg-green-500">
											<div
												class="absolute -ml-0.5 -mt-0.5 h-2 w-2 animate-ping rounded-full bg-green-500"
											></div>
										</div>
									{:else}
										<div class="flex items-center gap-2">
											<div class="relative h-1 w-1 rounded-full bg-red-500"></div>
										</div>
									{/if}
									<p>Swap out</p>
								</div>
								<Switch checked={ks.allowSwapOut ?? false} onclick={() => updateAllowSwapOut(ks)} />
							</div>
						</div>
						<div
							class="bg-background grid h-40 w-full grid-cols-4 items-center justify-center gap-2 rounded-lg"
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
							<div class=" col-span-2 flex h-full flex-col items-center justify-end gap-2 pb-6">
								{Math.floor((proofsCount / promisesCount) * 100)} %
								<ProgressSuccess
									class="bg-sky-500 bg-opacity-60"
									value={Math.floor((proofsCount / promisesCount) * 100)}
								/>
								{Math.floor((totalProofs / totalPromises) * 100)} %
								<ProgressSuccess
									class="bg-sky-500 bg-opacity-60"
									value={Math.floor((totalProofs / totalPromises) * 100)}
								/>
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
				</div>
			{/each}
		</div>
	{:else}
		<LoaderCircle class="animate-spin"></LoaderCircle>
	{/if}
</div>

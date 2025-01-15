<script>
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { LoaderCircle } from 'lucide-svelte';
	import { pingStore } from '../../stores';
</script>

<div>
	{#if $pingStore === undefined}
		<Badge variant="outline">
			<LoaderCircle class="h-4 w-4 animate-spin"></LoaderCircle>
		</Badge>
	{:else if $pingStore?.backendConnection?.isConnected}
		<Badge variant="outline" class="text-green-500">
			<div class="flex items-center gap-2">
				<p>Connected</p>
				<div class="relative h-1 w-1 rounded-full bg-green-500">
					<div
						class="absolute -ml-0.5 -mt-0.5 h-2 w-2 animate-ping rounded-full bg-green-500"
					></div>
				</div>
			</div>
		</Badge>
	{:else}
		<Badge variant="outline" class="text-red-500">
			<div class="flex items-center gap-2">
				<p>Disconnected</p>
				<div class="relative h-1 w-1 rounded-full bg-red-500"></div>
			</div>
		</Badge>
	{/if}
</div>

<script>
	import FormButton from '$lib/components/ui/form/form-button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { LoaderCircle } from 'lucide-svelte';
	import { settings } from '../../../stores';
	import { ensureError } from '../../../errors';
	import { toast } from 'svelte-sonner';

	let isLoading = $state(false);
	let seed = $state('');
	const updateSettings = async () => {
        try {
			isLoading = true
			if (seed) {
				await settings.createKeys(seed)
				
			}
			else {
				await settings.createKeys()
			}
			toast.success('Added mint nostr key')
		} catch (error) {
			console.error(error);
			const err = ensureError(error);
			toast.error(err.message);
		}
		finally {
			isLoading = false
		}

    };
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		updateSettings();
	}}
>
	<div class="flex flex-col items-start justify-start gap-6">
		<div>
			<p class="w-80 break-before-auto font-bold">Create mint keys</p>
		</div>

		<div class="flex w-full flex-col gap-2">
			<p>From seed (Optional)</p>
			<Input disabled={isLoading} class="w-full" placeholder="milk sad ..." bind:value={seed} />
		</div>

		<FormButton disabled={isLoading} type="submit" class="w-full">
			{#if isLoading}
				<LoaderCircle class="animate-spin"></LoaderCircle>
			{/if}
			Create keys
		</FormButton>
	</div>
</form>

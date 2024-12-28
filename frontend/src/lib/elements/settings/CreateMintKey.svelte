<script>
	import Button from '$lib/components/ui/button/button.svelte';
	import FormButton from '$lib/components/ui/form/form-button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { LoaderCircle } from 'lucide-svelte';
	import { settings } from '../../../stores';

	let isLoading = $state(false);
	let seed = $state('');
	const updateSettings = async () => {
        if (seed) {
            settings.createKe
            //TODO
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

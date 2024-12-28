<script lang="ts">
	import FormButton from '$lib/components/ui/form/form-button.svelte';

	import Input from '$lib/components/ui/input/input.svelte';
	import { Textarea } from '$lib/components/ui/textarea/';
	import { LoaderCircle } from 'lucide-svelte';
	import { settings } from '../../../stores';
	import type { UpdatePayload } from '../../../stores';
	import { toast } from 'svelte-sonner';
	import { ensureError } from '../../../errors';
	let mintName = $state('');
	let mintDescription = $state('');
	let mintIconUrl = $state('');
	let mintDescriptionLong = $state('');
	let isLoading = $state(false);

    const updateSettings = async () => {
		try {
			isLoading = true;
            const payload: UpdatePayload  = {
                description: mintDescription,
                name: mintName,
                descripttionLong: mintDescriptionLong
            }
            if (mintIconUrl) {
                payload.iconURL = mintIconUrl
            }
			const res = await settings.updateSettings(payload);
            if (res.status!==200) {
                const data = await res.json()
                console.log(data)
                throw new Error(data.message);
            }
            await settings.load()
			toast.success('Mint settings saved');
		} catch (error) {
			console.error(error);
			const err = ensureError(error);
			toast.error(err.message);
		} finally {
			isLoading = false;
		}
	};
</script>
<form
	onsubmit={(e) => {
		e.preventDefault();
		updateSettings()
	}}
>
<div class="flex flex-col items-start justify-start gap-6">
	<div>
		<p class="w-80 break-before-auto font-bold">Set up your mint</p>
	</div>

	<div class="flex w-full flex-col gap-2">
		<p>Mint name</p>
		<Input
			disabled={isLoading}
			required
			class="w-full"
			placeholder="My mint"
			bind:value={mintName}
		/>
	</div>

	<div class="flex w-full flex-col gap-2">
		<p>Mint description</p>
		<Input
			disabled={isLoading}
			required
			class="w-full"
			placeholder="Hello world! "
			bind:value={mintDescription}
		/>
	</div>

	<div class="flex w-full flex-col gap-2">
		<p>Mint description (long)</p>
		<Textarea
			disabled={isLoading}
			required
			class="w-full"
			placeholder="This is the best mint ever. bla bla bla"
			bind:value={mintDescriptionLong}
		/>
	</div>
	<div class="flex w-full flex-col gap-2">
		<p>Icon URL (optional)</p>
		<Input
			disabled={isLoading}
			class="w-full"
			placeholder="https://mydomain.com/logo.jpg"
			bind:value={mintIconUrl}
		/>
	</div>
	<FormButton disabled={isLoading} type="submit" class="w-full">
		{#if isLoading}
			<LoaderCircle class="animate-spin"></LoaderCircle>
		{/if}
		Confirm
	</FormButton>
</div>
</form>
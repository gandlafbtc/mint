<script>
	import FormButton from '$lib/components/ui/form/form-button.svelte';
import Input from '$lib/components/ui/input/input.svelte';
	import Switch from '$lib/components/ui/switch/switch.svelte';
	import { toast } from 'svelte-sonner';
	import { settings } from '../../../stores';
	import { ensureError } from '../../../errors';
	let isLoading = $state(false)
    const mintSettings = $state({
		mintingDisabled:
			$settings.find((s) => s.key === 'minting-disabled')?.value === 'true' ? true : false,
		meltingDisabled:
			$settings.find((s) => s.key === 'melting-disabled')?.value === 'true' ? true : false,
		mintMaxAmt: $settings.find((s) => s.key === 'mint-max-amt')?.value ?? '0',
		mintMinAmt: $settings.find((s) => s.key === 'mint-min-amt')?.value ?? '0',
		meltMaxAmt: $settings.find((s) => s.key === 'melt-max-amt')?.value ?? '0',
		meltMinAmt: $settings.find((s) => s.key === 'melt-min-amt')?.value ?? '0'
	});

	const updateSettings = async () => {
        try {
            isLoading = true
            await settings.updateSettings([
                ['minting-disabled', mintSettings.mintingDisabled?'true':'false'],
                ['melting-disabled', mintSettings.meltingDisabled?'true':'false'],
                ['mint-max-amt', mintSettings.mintMaxAmt],
                ['mint-min-amt', mintSettings.mintMinAmt],
                ['melt-max-amt', mintSettings.meltMaxAmt],
                ['melt-min-amt', mintSettings.meltMinAmt]
            ])
            toast.success('Settings updated')
        } catch (error) {
            console.error(error);
			const err = ensureError(error);
			toast.error(err.message);
        }
        finally {
            isLoading= false
        }
    };
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		updateSettings();
	}}
>
<div class="m-2 flex w-96 flex-col gap-2">
    <p class="font-bold">Mint settings</p>
	<div class="grid grid-cols-2">
        <p>Disable minting</p>
		<Switch disabled={isLoading}  bind:checked={mintSettings.mintingDisabled} />
	</div>
	<div class="grid grid-cols-2">
        <p>Disable melting</p>
		<Switch disabled={isLoading}  bind:checked={mintSettings.meltingDisabled} />
	</div>
	<div class="grid grid-cols-2">
        <p>Max minting amount</p>
		<Input disabled={isLoading} type="number" bind:value={mintSettings.mintMaxAmt} />
	</div>
	<div class="grid grid-cols-2">
        <p>Min minting amount</p>
		<Input  disabled={isLoading} type="number" bind:value={mintSettings.mintMinAmt} />
	</div>
	<div class="grid grid-cols-2">
        <p>Max melting amount</p>
		<Input disabled={isLoading}  type="number" bind:value={mintSettings.meltMaxAmt} />
	</div>
	<div class="grid grid-cols-2">
        <p>Min melting amount</p>
		<Input  disabled={isLoading} type="number" bind:value={mintSettings.meltMinAmt} />
	</div>
    <FormButton disabled={isLoading} type='submit'>
        Save
    </FormButton>
</div>

</form>
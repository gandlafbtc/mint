<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import CompleteOnboarding from '$lib/elements/settings/CompleteOnboarding.svelte';
	import ConnectBackendForm from '$lib/elements/settings/ConnectBackendForm.svelte';
	import CreateMintKey from '$lib/elements/settings/CreateMintKey.svelte';
	import MintGeneralForm from '$lib/elements/settings/MintGeneralForm.svelte';

	import { settings } from '../../stores';
	settings.load();
</script>

<div class="flex flex-col items-center justify-center gap-5">
	{#if !$settings.find((e: any) => e.key === 'mint-name')}
		<MintGeneralForm></MintGeneralForm>
	{:else if !$settings.find((e: any) => e.key === 'backend-type')}
		<ConnectBackendForm></ConnectBackendForm>
	{:else if !$settings.find((e: any) => e.key === 'mint-pub-key')}
		<CreateMintKey></CreateMintKey>
	{:else if !$settings.find((e: any) => e.key === 'onboarded')}
		<CompleteOnboarding></CompleteOnboarding>
	{/if}
</div>

<style>
</style>

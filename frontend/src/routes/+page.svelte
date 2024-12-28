<script lang="ts">
	import { PUBLIC_APP_NAME, PUBLIC_MINT_API } from '$env/static/public';
	import { LoaderCircle } from 'lucide-svelte';
	import { settings, userLoggedIn } from '../stores';
	import Terminal from 'lucide-svelte/icons/terminal';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import Dashboard from '$lib/elements/Dashboard.svelte';
	const response = settings.load();
</script>

<div class=" p-2">
	{#if $settings}
		{#if $settings.find((e: any) => e.key === 'onboarded')}
        <Dashboard></Dashboard>
        {:else}
			<Alert.Root>
				<Terminal class="size-4" />
				<Alert.Title>Welcome!</Alert.Title>
				<Alert.Description
					>Please continue with the <a href="/setup" class="underline">Setup</a> to use {PUBLIC_APP_NAME}.</Alert.Description
				>
			</Alert.Root>
		{/if}
	{/if}
</div>

<style>
</style>

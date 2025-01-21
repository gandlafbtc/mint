<script lang="ts">
	import FormButton from '$lib/components/ui/form/form-button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import BackendTypeSelector from '$lib/elements/settings/BackendTypeSelector.svelte';
	import { toast } from 'svelte-sonner';
	import { settings } from '../../../stores';
	import { LoaderCircle } from 'lucide-svelte';
	import { ensureError } from '../../../errors';
	import type { ConnectPayload } from '@mnt/common/types';

	interface Props {backendSettings?: ConnectPayload}
	
	let {backendSettings}: Props = $props();

	let backendType = $state(backendSettings?.type??'LND');
	let backendHost = $state(backendSettings?.rpcHost??'');
	let backendCert = $state(backendSettings?.tlsCertHex??'');
	let backendMacaroon = $state(backendSettings?.macaroonHex??'');
	let nwcString = $state(backendSettings?.nwcString??'');
	let isLoading = $state(false);
	const connectBackend = async () => {
		try {
			isLoading = true;
			const res = await settings.connectBackend({
				macaroonHex: backendMacaroon,
				nwcString: nwcString,
				rpcHost: backendHost,
				tlsCertHex: backendCert,
				type: backendType
			});
			toast.success('Backend connected');
            
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
		connectBackend();
	}}
>
	<div class="flex flex-col items-start justify-start gap-6">
		<div>
			<p class="w-80 break-before-auto font-bold">Connect a lightning backend</p>
		</div>
		<div class="flex flex-col gap-2">
			<p>Select a lightning implementation</p>
			<BackendTypeSelector bind:backendType></BackendTypeSelector>
		</div>

		{#if backendType === 'LND'}
		<div class="flex w-full flex-col gap-2">
			<p>RPC Host</p>
			<Input disabled={isLoading} required class="w-full" placeholder="127.0.0.1:10001" bind:value={backendHost} />
		</div>

		<div class="flex w-full flex-col gap-2">
			<p>TLS cert (hex)</p>
			<Input disabled={isLoading} required class="w-full" placeholder="2d2d2d2d2d42...." bind:value={backendCert} />
		</div>

		<div class="flex w-full flex-col gap-2">
			<p>Admin macaroon (hex)</p>
			<Input disabled={isLoading} required class="w-full" placeholder="0201036c6e...." bind:value={backendMacaroon} />
		</div>
		{:else if backendType === 'NWC'}
		<div class="flex w-full flex-col gap-2">
			<p>Connection string (URL)</p>
			<Input disabled={isLoading} required class="w-full" placeholder="nostr+walletconnect://....." bind:value={nwcString} />
		</div>
		{:else}
		  ...
		{/if}

		

		<FormButton disabled={isLoading} type="submit" class="w-full">
        {#if isLoading}
            <LoaderCircle class='animate-spin'>

            </LoaderCircle>
        {/if}
            Connect
        </FormButton>
	</div>
</form>

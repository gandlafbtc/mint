<script lang="ts">
	import ConnectBackendForm from '$lib/elements/settings/ConnectBackendForm.svelte';
	import { settings } from '../../../stores';
    import { type ConnectPayload } from "@mnt/common/types";



    const backendSettings: ConnectPayload = $state({
        macaroonHex: $settings.find(s=>s.key === 'backend-macaroon')?.value??'',
        rpcHost: $settings.find(s=>s.key === 'backend-rpc-host')?.value??'',
        tlsCertHex: $settings.find(s=>s.key === 'backend-tls-cert')?.value??'',
        nwcString: $settings.find(s=>s.key === 'backend-nwc-connection')?.value??'',
        type: $settings.find(s=>s.key === 'backend-type')?.value??'',
    })
</script>
<div class="flex w-96 m-4">

    <ConnectBackendForm {backendSettings}>
        
    </ConnectBackendForm>
</div>

<style>
</style>

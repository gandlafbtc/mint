<script lang="ts">
	import ConnectBackendForm from '$lib/elements/settings/ConnectBackendForm.svelte';
	import MintGeneralForm from '$lib/elements/settings/MintGeneralForm.svelte';
	import { settings } from '../../../stores';
    import { type ConnectPayload, type GeneralSettings } from "@mnt/common/types";

    const mintSettings: GeneralSettings = $state({
        mintDescription: $settings.find(s=>s.key === 'mint-description')?.value??'',
        mintDescriptionLong: $settings.find(s=>s.key === 'mint-description-long')?.value??'',
        mintIconUrl: $settings.find(s=>s.key === 'mint-icon-url')?.value??'',
        mintName: $settings.find(s=>s.key === 'mint-name')?.value??'',
    })
</script>
<div class="flex w-96 m-4">

    <MintGeneralForm {mintSettings}>
        
    </MintGeneralForm>
</div>

<style>
</style>

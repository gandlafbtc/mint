<script lang="ts">
	import ConnectBackendForm from "$lib/elements/settings/ConnectBackendForm.svelte";
	import CreateMintKey from "$lib/elements/settings/CreateMintKey.svelte";
	import MintGeneralForm from "$lib/elements/settings/MintGeneralForm.svelte";


	import { settings } from "../../stores";  
    settings.load()

</script>

<div class="flex items-center justify-center flex-col gap-5">

        {#if !$settings.find((e: any)=> e.key==='backend-type')}
            <ConnectBackendForm></ConnectBackendForm>
        {:else if !$settings.find((e: any)=> e.key==='mint-name')}
            <MintGeneralForm></MintGeneralForm>
        {:else if !$settings.find((e: any)=> e.key==='mint-key')}
            <CreateMintKey></CreateMintKey>
        {/if}
</div>

<style>

</style>
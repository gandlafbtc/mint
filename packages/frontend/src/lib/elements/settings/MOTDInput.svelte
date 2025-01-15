<script>
	import Input from "$lib/components/ui/input/input.svelte";
	import { Check, Pen } from "lucide-svelte";
	import { settings } from "../../../stores";
	import Button from "$lib/components/ui/button/button.svelte";
	import FormButton from "$lib/components/ui/form/form-button.svelte";
	import { ensureError } from "../../../errors";
	import { toast } from "svelte-sonner";
    
    let isEdit = $state(false)
    let message = $state($settings.find(s=> s.key==='mint-motd')?.value??'')

    let isLoading = $state(false)

    const updateMotd = async () => {
        try {
            isLoading = true
            await settings.updateSettings([['mint-motd', message]])
			toast.success("Message to users updated");
            isEdit = false
        } catch (error) {
            console.error(error);
			const err = ensureError(error);
			toast.error(err.message);
        }
        finally {
            isLoading = false
        }
    }

</script>
<div class="flex gap-2 items-center w-full">
    <form onsubmit={updateMotd} class="flex w-full">

        <Input placeholder='message to users' class='rounded-full w-full' bind:value={message} disabled={!isEdit} />
        {#if isEdit}
        <FormButton type='submit'>
            <Check></Check>
        </FormButton>
        {/if}
    </form>

    <button class="flex gap-1 text-secondary" onclick={()=>{isEdit=!isEdit}}>
        <Pen class='w-4'></Pen>
        <p class="text-sm">
            {#if isEdit}
            Cancel
            {:else}
            Update
            {/if}
        </p>
    </button>
</div>
<script>
	import Button from "$lib/components/ui/button/button.svelte";
	import { toast } from "svelte-sonner";
	import { ensureError } from "../../../errors";
	import { settings } from "../../../stores";
	import { goto } from "$app/navigation";
    let isLoading = $state(false)

    const addKeyset = async () => {
        try {
            isLoading=true

            // create keyset
            await settings.createKeyset({unit: 'sat'})
            await settings.updateSettings([['onboarded', 'true']])
            toast.success('New Keyset created')
            goto('/')
        }catch (error) {
			console.error(error);
			const err = ensureError(error);
			toast.error(err.message);
		} finally {
			isLoading = false;
		}
    }
</script>
<div class="flex gap-2 justify-start flex-col">
    <p class="font-bold">
        Mint configured
    </p>
    <p>
        Continue by adding a keyset
    </p>
    <Button onclick={addKeyset}>
        Add Keyset
    </Button>
</div>
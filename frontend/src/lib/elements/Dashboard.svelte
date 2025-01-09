<script lang="ts">
	import { LoaderCircle, Plus } from "lucide-svelte";
	import { keysets } from "../../stores";
import NumberFlow from '@number-flow/svelte'
	import Chart from "./Chart.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
</script>
<div class="w-full h-full grid grid-cols-3 gap-2">
    <div class="bg-secondary h-52 rounded-lg p-2 flex flex-col">
        <div class="flex gap-2 justify-between items-center">

            <p class="font-bold">
                Keysets
            </p>
            <Button onclick={()=>keysets.createKeyset({})}>
                <Plus></Plus>
            </Button>
        </div>
        {#if $keysets}
        <!-- {JSON.stringify($keysets)} -->
        <div class="h-full grid grid-cols-3 gap-2 items-center">
            <div class="flex flex-col gap-2 items-center justify-center">
                <p class="">  
                    Total
                </p>
                <p class="font-bold text-3xl">
                    <NumberFlow value={$keysets.length}></NumberFlow>
                </p>
            </div>
            <div class="text-green-500 flex flex-col gap-2 items-center justify-center">
                <p class="">  
                    Active
                </p>
                <p class="font-bold text-3xl">
                    <NumberFlow value={$keysets.filter(ks=> ks.isActive).length}></NumberFlow>
                </p>
            </div>
            <div class="text-yellow-500 flex flex-col gap-2 items-center justify-center">
                <p class="">  
                    Inactive
                </p>
                <p class="font-bold text-3xl">
                    <NumberFlow value={$keysets.filter(ks=> !ks.isActive).length}></NumberFlow>
                </p>
            </div>
        </div>
          
        {:else}
        <LoaderCircle class='animate-spin'>
        </LoaderCircle>          
        {/if}
    </div>
    <div class="bg-secondary h-52 rounded-lg p-2">
        
    </div>
    <div class="bg-secondary h-52 rounded-lg p-2">
        
    </div>
    <div class="col-span-3 bg-secondary h-[40rem] rounded-lg p-2">
        <Chart></Chart>
    </div>
</div>
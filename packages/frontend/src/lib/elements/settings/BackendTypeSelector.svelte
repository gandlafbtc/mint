<script lang="ts">
    import * as Select from "$lib/components/ui/select/index.js";
    interface Props {
        backendType?:string
    }
    let {backendType=$bindable('LND')}: Props = $props();
    const options = [['LND', 'LND'], ['NWC', 'NWC']]
  </script>
  
  <div class="w-80">
    <Select.Root type="single" bind:value={backendType} allowDeselect={false}>
        <Select.Trigger class="w-80">{backendType}</Select.Trigger>
        <Select.Content>
        {#each options as item}
        <Select.Item value={item[0]}>{item[1]}</Select.Item>
        {/each}
        </Select.Content>
      </Select.Root>
          
  </div>
  
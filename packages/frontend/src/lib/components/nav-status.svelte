<script lang="ts">
	import { useSidebar } from "$lib/components/ui/sidebar/context.svelte.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import BackendConnectionIndicator from "$lib/elements/BackendConnectionIndicator.svelte";
	import { settings } from "../../stores";
	const sidebar = useSidebar();
</script>

<Sidebar.Group class="group-data-[collapsible=icon]:hidden">
	<Sidebar.GroupLabel>Status</Sidebar.GroupLabel>
	<Sidebar.Menu>
		<Sidebar.MenuItem>
			<Sidebar.MenuButton>
				{#snippet child({ props })}
				<div class="flex gap-2 items-center ml-2">
					{$settings.find(s=> s.key === 'backend-type')?.value}
					<BackendConnectionIndicator></BackendConnectionIndicator>
				</div>
				{/snippet}
			</Sidebar.MenuButton>
			
		</Sidebar.MenuItem>
		</Sidebar.Menu>
</Sidebar.Group>

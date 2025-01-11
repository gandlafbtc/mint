<script lang="ts">
	import { page } from "$app/state";
	import AppSidebar from "$lib/components/app-sidebar.svelte";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import DarkModeToggle from "$lib/elements/DarkModeToggle.svelte";
	import type { Component, Snippet } from "svelte";
	interface Props {children: Snippet}
	
	let {children}: Props = $props();
</script>

<Sidebar.Provider>
	<AppSidebar />
	<Sidebar.Inset>
		<header
			class="flex pr-2 justify-between h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
		>
			<div class="flex items-center gap-2 px-4">
				<Sidebar.Trigger class="-ml-1" />
				<Separator orientation="vertical" class="mr-2 h-4" />
				<Breadcrumb.Root>
					<Breadcrumb.List>
						{#each page.url.pathname.split('/') as pathname}
						{#if pathname}
						
						<Breadcrumb.Separator class="hidden md:block" />
						<Breadcrumb.Item class="hidden md:block">
							<Breadcrumb.Link href="">{pathname}</Breadcrumb.Link>
						</Breadcrumb.Item>
						{/if}
						{/each}
					</Breadcrumb.List>
				</Breadcrumb.Root>
			</div>
			<DarkModeToggle></DarkModeToggle>
		</header>
		{@render children()}
	</Sidebar.Inset>
</Sidebar.Provider>

<script lang="ts">
	import SidebarPage from '$lib/components/sidebar-page.svelte';
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';  
	import { Toaster } from "$lib/components/ui/sonner/index.js";
	import { userLoggedIn } from '../stores';
	import { onMount } from 'svelte';
	import { delay } from '../util/util';
	import { goto } from '$app/navigation';
	import { LoaderCircle } from "lucide-svelte";
	let { children } = $props();
	let isLoaded = $state(false)
	onMount(async ()=> {
		await delay(500)
		isLoaded = true
		if (!$userLoggedIn) {
			goto('/login')
		}
	})
</script>
<Toaster position="top-right" richColors closeButton></Toaster>

<ModeWatcher />
{#if isLoaded}

{#if $userLoggedIn}
<SidebarPage>
	{@render children?.()}
</SidebarPage>

{:else}
{@render children?.()}

{/if}
{:else}
<div class="w-full h-screen flex items-center justify-center">
	<div class="flex gap-3">
		<LoaderCircle class='animate-spin'></LoaderCircle>
		<p>
			Loading...
		</p>
	</div>	
  </div>
{/if}

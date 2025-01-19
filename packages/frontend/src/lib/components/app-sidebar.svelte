<script lang="ts" module>
	import ChartPie from "lucide-svelte/icons/chart-pie";
	import Frame from "lucide-svelte/icons/frame";
	import Map from "lucide-svelte/icons/map";
	import Settings2 from "lucide-svelte/icons/settings-2";

	// This is sample data.
	const data = {

		mints: [
			{
				name: "Default mint",
				logo: Landmark,
				plan: "Default mint",
			},
		],
		navMain: [
			// {
			// 	title: "Documentation",
			// 	url: "#",
			// 	icon: BookOpen,
			// 	items: [
			// 		{
			// 			title: "Introduction",
			// 			url: "#",
			// 		},
			// 		{
			// 			title: "Get Started",
			// 			url: "#",
			// 		},
			// 		{
			// 			title: "Tutorials",
			// 			url: "#",
			// 		},
			// 		{
			// 			title: "Changelog",
			// 			url: "#",
			// 		},
			// 	],
			// },
			{
				title: "Settings",
				url: "#",
				icon: Settings2,
				items: [
					{
						title: "Mint Info",
						url: "/settings/info",
					},
					{
						title: "Mint options",
						url: "/settings/mint-options",
					},
					{
						title: "Backend",
						url: "/settings/backend",
					},
				],
			},
		],
		insights: [
			{
				name: "Dashboard",
				url: "/",
				icon: LayoutDashboard,
			},
			{
				name: "Keysets",
				url: "/keysets",
				icon: Key,
			},
			// {
			// 	name: "Charts",
			// 	url: "#",
			// 	icon: ChartPie,
			// }
		],
	};
</script>

<script lang="ts">
	import NavMain from "$lib/components/nav-main.svelte";
	import NavProjects from "$lib/components/nav-projects.svelte";
	import NavUser from "$lib/components/nav-user.svelte";
	import TeamSwitcher from "$lib/components/team-switcher.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import type { ComponentProps } from "svelte";
	import { Key, Landmark, LayoutDashboard } from "lucide-svelte";
	import NavStatus from "./nav-status.svelte";

	let {
		ref = $bindable(null),
		collapsible = "icon",
		...restProps
	}: ComponentProps<typeof Sidebar.Root> = $props();
</script>

<Sidebar.Root bind:ref {collapsible} {...restProps}>
	<Sidebar.Header>
		<TeamSwitcher mints={data.mints} />
	</Sidebar.Header>
	<Sidebar.Content>


		<NavStatus/>
		<NavProjects insights={data.insights} />

		<NavMain items={data.navMain} />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>

<script lang="ts">
	import QrCodeIcon from '@lucide/svelte/icons/qr-code';
	import WifiIcon from '@lucide/svelte/icons/wifi';
	import WifiOffIcon from '@lucide/svelte/icons/wifi-off';
	import ServerIcon from '@lucide/svelte/icons/server';
	import { onConnectionChange } from '$lib/socket';
	import CreateServiceRequestForm from '$lib/components/create-service-request-form.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let connected = $state(false);

	$effect(() => {
		return onConnectionChange((value) => {
			connected = value;
		});
	});
</script>

<div class="mx-auto flex max-w-xl flex-col gap-4 p-8">
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<QrCodeIcon class="size-5" />
				HeavenlyQR
			</Card.Title>
			<Card.Description>Real-time QR code batch generation</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-wrap gap-2">
			<Badge variant={connected ? 'default' : 'secondary'} class="gap-1.5">
				{#if connected}
					<WifiIcon class="size-3.5" />
					Live updates connected
				{:else}
					<WifiOffIcon class="size-3.5" />
					Connecting…
				{/if}
			</Badge>
			<Badge variant={data.health?.status === 'ok' ? 'default' : 'secondary'} class="gap-1.5">
				<ServerIcon class="size-3.5" />
				{#if data.health}
					API {data.health.status} (db {data.health.dependencies.database}, redis {data.health
						.dependencies.redis})
				{:else}
					API unreachable
				{/if}
			</Badge>
		</Card.Content>
	</Card.Root>
	<Card.Root>
		<Card.Header>
			<Card.Title>Batch Generate</Card.Title>
			<Card.Description>Submit a URL and an ID range to generate a QR code per ID.</Card.Description
			>
		</Card.Header>
		<Card.Content>
			<CreateServiceRequestForm {form} />
		</Card.Content>
	</Card.Root>
</div>

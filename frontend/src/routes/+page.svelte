<script lang="ts">
	import QrCodeIcon from '@lucide/svelte/icons/qr-code';
	import WifiIcon from '@lucide/svelte/icons/wifi';
	import WifiOffIcon from '@lucide/svelte/icons/wifi-off';
	import { onConnectionChange } from '$lib/socket';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';

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
		<Card.Content>
			<Badge variant={connected ? 'default' : 'secondary'} class="gap-1.5">
				{#if connected}
					<WifiIcon class="size-3.5" />
					Live updates connected
				{:else}
					<WifiOffIcon class="size-3.5" />
					Connecting…
				{/if}
			</Badge>
		</Card.Content>
	</Card.Root>
</div>

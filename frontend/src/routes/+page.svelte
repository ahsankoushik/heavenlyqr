<script lang="ts">
	import QrCodeIcon from '@lucide/svelte/icons/qr-code';
	import WifiIcon from '@lucide/svelte/icons/wifi';
	import WifiOffIcon from '@lucide/svelte/icons/wifi-off';
	import ServerIcon from '@lucide/svelte/icons/server';
	import { resolve } from '$app/paths';
	import { onConnectionChange, subscribeToRequest, type ProgressEvent } from '$lib/socket';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import type { ActionData, PageData } from './$types';
	import { ApiClient, type CreateServiceRequestResult } from '$lib/api';
	import CreateServiceRequestForm from '$lib/components/create-service-request-form.svelte';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/button/button.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let connected = $state(false);

	const api = new ApiClient(undefined, fetch);
	// Task state
	let task = $state<{
		id: string;
		completed: number;
		total: number;
		status: string;
		cancelled: boolean;
	} | null>(null);

	$effect(() => {
		return onConnectionChange((value) => {
			connected = value;
		});
	});

	const onCreated = (d: CreateServiceRequestResult) => {
		task = {
			id: d.id,
			completed: 0,
			total: d.totalItems,
			status: 'PROCESSING',
			cancelled: false
		};

		subscribeToRequest(d.id, (event: ProgressEvent) => {
			task = {
				id: d.id,
				completed: event.completed,
				total: d.totalItems,
				status: event.status,
				cancelled: false
			};
		});
	};
	const cancelTask = async (id: string) => {
		try {
			const cancel = await api.serviceRequests.cancel(id);
			if (cancel.data.status === 'CANCELLED') {
				toast.success(cancel.message);
			} else {
				toast.error(cancel.message);
			}
		} catch {
			toast.error('Somthing Went Wrong');
		}
	};
</script>

<svelte:head><title>Heavenlyqr</title></svelte:head>

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
					API {data.health.status} (db {data.health.dependencies.database}, redis
					{data.health.dependencies.redis})
				{:else}
					API unreachable
				{/if}
			</Badge>
		</Card.Content>
	</Card.Root>

	<a
		href={resolve('/supervisor')}
		class="text-sm text-muted-foreground hover:text-foreground hover:underline"
	>
		View all service requests →
	</a>

	<Card.Root>
		<Card.Header>
			<Card.Title>Batch Generate</Card.Title>
			<Card.Description>
				Submit a URL and an ID range to generate a QR code per ID.
			</Card.Description>
		</Card.Header>

		<Card.Content>
			<CreateServiceRequestForm {form} {onCreated} />
		</Card.Content>
	</Card.Root>

	{#if task}
		<Card.Root>
			<Card.Header>
				<Card.Title>Generation Status</Card.Title>

				<Card.Description>
					{#if task.status === 'COMPLETED'}
						Your QR codes are ready to download.
					{:else}
						Generating and preparing your QR codes...
					{/if}
				</Card.Description>
			</Card.Header>

			<Card.Content class="space-y-4">
				{#if task.status !== 'COMPLETED'}
					<div class="flex items-center justify-between text-sm">
						<span>Generating QR codes</span>

						<span class="font-medium">
							{task.completed} / {task.total}
						</span>
					</div>

					<div class="h-3 w-full overflow-hidden rounded-full bg-muted">
						<div
							class="h-full rounded-full bg-primary transition-all duration-300"
							style={`width: ${
								task.total > 0 ? Math.min((task.completed / task.total) * 100, 100) : 0
							}%`}
						></div>
					</div>

					<div class="text-center text-sm text-muted-foreground">
						{Math.round(task.total > 0 ? Math.min((task.completed / task.total) * 100, 100) : 0)}%
					</div>

					<div class="flex justify-end pt-2">
						<Button type="button" onclick={() => cancelTask(task!.id)}>Cancel</Button>
					</div>
				{:else}
					<div class="flex items-center justify-center">
						<div class="text-center">
							<div class="mb-2 text-sm font-medium">Generation complete</div>

							<div class="text-sm text-muted-foreground">Your ZIP file is ready.</div>
						</div>
					</div>

					<div class="flex justify-center pt-2">
						<!-- eslint-disable svelte/no-navigation-without-resolve -- external backend URL, not a SvelteKit route -->
						<a
							href={api.serviceRequests.getZipDownloadUrl(task!.id)}
							download
							class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:cursor-pointer hover:bg-primary/90"
						>
							Download ZIP
						</a>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</div>

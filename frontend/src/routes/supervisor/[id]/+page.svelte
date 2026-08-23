<script lang="ts">
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import WifiIcon from '@lucide/svelte/icons/wifi';
	import WifiOffIcon from '@lucide/svelte/icons/wifi-off';
	import XIcon from '@lucide/svelte/icons/x';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { api } from '$lib/api/client.js';
	import type {
		Pagination as PaginationInfo,
		QrItemRecord,
		QrItemStatus,
		RequestStatus
	} from '$lib/api/types.js';
	import { QR_ITEM_STATUSES } from '$lib/api/types.js';
	import { onConnectionChange, subscribeToRequest, type ProgressEvent } from '$lib/socket.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const NON_TERMINAL: readonly RequestStatus[] = ['PENDING', 'PROCESSING'];
	const ZIP_READY: readonly RequestStatus[] = ['COMPLETED', 'PARTIALLY_FAILED', 'FAILED'];

	const STATUS_VARIANT: Record<RequestStatus, 'default' | 'secondary' | 'destructive' | 'outline'> =
		{
			PENDING: 'outline',
			PROCESSING: 'secondary',
			COMPLETED: 'default',
			PARTIALLY_FAILED: 'destructive',
			FAILED: 'destructive',
			CANCELLED: 'outline'
		};

	const ITEM_STATUS_VARIANT: Record<
		QrItemStatus,
		'default' | 'secondary' | 'destructive' | 'outline'
	> = {
		PENDING: 'outline',
		PROCESSING: 'secondary',
		COMPLETED: 'default',
		FAILED: 'destructive',
		CANCELLED: 'outline'
	};

	let connected = $state(false);
	let request = $state(data.request);
	let items = $state<QrItemRecord[]>(data.items);
	let pagination = $state<PaginationInfo>(data.pagination);
	let cancelling = $state(false);
	let refreshing = $state(false);

	$effect(() => {
		request = data.request;
		items = data.items;
		pagination = data.pagination;
	});

	$effect(() => {
		return onConnectionChange((value) => {
			connected = value;
		});
	});

	// Request-level progress arrives over the socket; item rows don't, so once
	// the request leaves a non-terminal state we pull the item list once more
	// to pick up whatever changed while it was running.
	$effect(() => {
		if (!NON_TERMINAL.includes(request.status)) return;
		return subscribeToRequest(request.id, (event: ProgressEvent) => {
			request = { ...request, status: event.status, completedItems: event.completed };
			if (!NON_TERMINAL.includes(event.status)) {
				void refreshItems();
			}
		});
	});

	function formatDate(iso: string): string {
		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: 'UTC'
		}).format(new Date(iso));
	}

	function progressPercent(): number {
		if (request.totalItems <= 0) return 0;
		return Math.min((request.completedItems / request.totalItems) * 100, 100);
	}

	async function cancelRequest(): Promise<void> {
		cancelling = true;
		try {
			const result = await api.serviceRequests.cancel(request.id);
			request = result.data;
			toast.success(result.message);
		} catch {
			toast.error('Failed to cancel request');
		} finally {
			cancelling = false;
		}
	}

	async function refreshItems(): Promise<void> {
		refreshing = true;
		try {
			const result = await api.serviceRequests.items(request.id, {
				page: pagination.page,
				limit: pagination.limit,
				status: data.status ?? undefined
			});
			items = result.data;
			pagination = result.pagination;
		} catch {
			toast.error('Failed to refresh items');
		} finally {
			refreshing = false;
		}
	}

	function updateQuery(next: Record<string, string | undefined>): void {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		for (const [key, value] of Object.entries(next)) {
			if (value === undefined) {
				params.delete(key);
			} else {
				params.set(key, value);
			}
		}
		void goto(resolve(`/supervisor/${request.id}?${params}`), { keepFocus: true });
	}

	function goToPage(newPage: number): void {
		updateQuery({ page: String(newPage) });
	}

	function setStatusFilter(value: string): void {
		updateQuery({ status: value === 'ALL' ? undefined : value, page: undefined });
	}
</script>

<svelte:head><title>Request {request.id} — HeavenlyQR</title></svelte:head>

<div class="mx-auto flex max-w-5xl flex-col gap-4 p-8">
	<a
		href={resolve('/supervisor')}
		class="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
	>
		<ArrowLeftIcon class="size-3.5" />
		Back to all requests
	</a>

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex flex-wrap items-center justify-between gap-2">
				<span class="max-w-md truncate" title={request.url}>{request.url}</span>
				<span class="flex items-center gap-2">
					<Badge variant={connected ? 'default' : 'secondary'} class="gap-1.5">
						{#if connected}
							<WifiIcon class="size-3.5" />
							Live
						{:else}
							<WifiOffIcon class="size-3.5" />
							Connecting…
						{/if}
					</Badge>
					<Badge variant={STATUS_VARIANT[request.status]}>{request.status}</Badge>
				</span>
			</Card.Title>
			<Card.Description>
				IDs {request.idRangeStart}–{request.idRangeEnd} &middot; created {formatDate(
					request.createdAt
				)}
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="flex items-center justify-between text-sm">
				<span>Progress</span>
				<span class="font-medium">
					{request.completedItems} / {request.totalItems}
					{#if request.failedItems > 0}
						&middot; {request.failedItems} failed
					{/if}
				</span>
			</div>
			<div class="h-3 w-full overflow-hidden rounded-full bg-muted">
				<div
					class="h-full rounded-full bg-primary transition-all duration-300"
					style={`width: ${progressPercent()}%`}
				></div>
			</div>

			<div class="flex justify-end gap-2 pt-2">
				{#if NON_TERMINAL.includes(request.status)}
					<Button
						variant="outline"
						size="sm"
						class="gap-1.5"
						disabled={cancelling}
						onclick={cancelRequest}
					>
						<XIcon class="size-3.5" />
						Cancel
					</Button>
				{/if}
				{#if ZIP_READY.includes(request.status)}
					<!-- eslint-disable svelte/no-navigation-without-resolve -- external backend URL, not a SvelteKit route -->
					<a
						href={api.serviceRequests.getZipDownloadUrl(request.id)}
						download
						class="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs hover:bg-accent hover:text-accent-foreground"
					>
						<DownloadIcon class="size-3.5" />
						Download ZIP
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex flex-wrap items-center justify-between gap-2">
				QR Items
				<span class="flex items-center gap-2">
					<Select.Root type="single" value={data.status ?? 'ALL'} onValueChange={setStatusFilter}>
						<Select.Trigger size="sm">
							{data.status ?? 'All statuses'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="ALL">All statuses</Select.Item>
							{#each QR_ITEM_STATUSES as itemStatus (itemStatus)}
								<Select.Item value={itemStatus}>{itemStatus}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<Button
						variant="outline"
						size="sm"
						class="gap-1.5"
						disabled={refreshing}
						onclick={refreshItems}
					>
						<RefreshCwIcon class={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
						Refresh
					</Button>
				</span>
			</Card.Title>
			<Card.Description>One row per QR code in this request's ID range.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if items.length === 0}
				<p class="py-8 text-center text-sm text-muted-foreground">No items match this filter.</p>
			{:else}
				<div class="overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Item ID</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head>Attempts</Table.Head>
								<Table.Head>Error</Table.Head>
								<Table.Head class="text-right">Actions</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each items as item (item.id)}
								<Table.Row>
									<Table.Cell class="font-medium">{item.itemId}</Table.Cell>
									<Table.Cell>
										<Badge variant={ITEM_STATUS_VARIANT[item.status]}>{item.status}</Badge>
									</Table.Cell>
									<Table.Cell class="text-sm text-muted-foreground">{item.attempts}</Table.Cell>
									<Table.Cell
										class="max-w-64 truncate text-sm text-destructive"
										title={item.errorMessage ?? undefined}
									>
										{item.errorMessage ?? '—'}
									</Table.Cell>
									<Table.Cell class="text-right">
										{#if item.status === 'COMPLETED'}
											<!-- eslint-disable svelte/no-navigation-without-resolve -- external backend URL, not a SvelteKit route -->
											<a
												href={api.serviceRequests.itemImageUrl(request.id, item.itemId)}
												target="_blank"
												rel="noopener noreferrer"
												class="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs hover:bg-accent hover:text-accent-foreground"
											>
												<EyeIcon class="size-3.5" />
												View
											</a>
											<!-- eslint-enable svelte/no-navigation-without-resolve -->
										{/if}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>

				{#if pagination.totalPages > 1}
					<div class="mt-4">
						<Pagination.Root
							count={pagination.total}
							perPage={pagination.limit}
							page={pagination.page}
							onPageChange={goToPage}
						>
							{#snippet children({ pages, currentPage })}
								<Pagination.Content>
									<Pagination.Item>
										<Pagination.PrevButton />
									</Pagination.Item>
									{#each pages as pageItem (pageItem.key)}
										{#if pageItem.type === 'ellipsis'}
											<Pagination.Item>
												<Pagination.Ellipsis />
											</Pagination.Item>
										{:else}
											<Pagination.Item>
												<Pagination.Link
													page={pageItem}
													isActive={currentPage === pageItem.value}
												/>
											</Pagination.Item>
										{/if}
									{/each}
									<Pagination.Item>
										<Pagination.NextButton />
									</Pagination.Item>
								</Pagination.Content>
							{/snippet}
						</Pagination.Root>
					</div>
				{/if}
			{/if}
		</Card.Content>
	</Card.Root>
</div>

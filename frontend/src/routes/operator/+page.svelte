<script lang="ts">
	import XIcon from '@lucide/svelte/icons/x';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import WifiIcon from '@lucide/svelte/icons/wifi';
	import WifiOffIcon from '@lucide/svelte/icons/wifi-off';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { SvelteSet, SvelteURLSearchParams } from 'svelte/reactivity';
	import { api } from '$lib/api/client.js';
	import type {
		Pagination as PaginationInfo,
		RequestStatus,
		ServiceRequestRecord
	} from '$lib/api/types.js';
	import {
		onConnectionChange,
		onOperatorEvent,
		subscribeToRequest,
		type ProgressEvent
	} from '$lib/socket.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let connected = $state(false);

	const NON_TERMINAL: readonly RequestStatus[] = ['PENDING', 'PROCESSING'];

	const STATUS_VARIANT: Record<RequestStatus, 'default' | 'secondary' | 'destructive' | 'outline'> =
		{
			PENDING: 'outline',
			PROCESSING: 'secondary',
			COMPLETED: 'default',
			PARTIALLY_FAILED: 'destructive',
			FAILED: 'destructive',
			CANCELLED: 'outline'
		};

	let requests = $state<ServiceRequestRecord[]>(data.requests);
	let pagination = $state<PaginationInfo>(data.pagination);
	const cancellingIds = new SvelteSet<string>();
	$effect(() => {
		return onConnectionChange((value) => {
			connected = value;
		});
	});

	$effect(() => {
		requests = data.requests;
		pagination = data.pagination;
	});

	function formatDate(iso: string): string {
		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: 'UTC'
		}).format(new Date(iso));
	}

	function progressPercent(request: ServiceRequestRecord): number {
		if (request.totalItems <= 0) return 0;
		return Math.min((request.completedItems / request.totalItems) * 100, 100);
	}

	function applyProgress(requestId: string, status: RequestStatus, completed: number): void {
		requests = requests.map((row) =>
			row.id === requestId ? { ...row, status, completedItems: completed } : row
		);
	}

	async function cancelRequest(id: string): Promise<void> {
		cancellingIds.add(id);
		try {
			const result = await api.serviceRequests.cancel(id);
			requests = requests.map((row) => (row.id === id ? result.data : row));
			toast.success(result.message);
		} catch {
			toast.error('Failed to cancel request');
		} finally {
			cancellingIds.delete(id);
		}
	}

	function goToPage(newPage: number): void {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('page', String(newPage));
		void goto(resolve(`/operator?${params}`), { keepFocus: true });
	}

	$effect(() => {
		return onOperatorEvent(async (event: ProgressEvent) => {
			if (requests.some((row) => row.id === event.requestId)) return;

			pagination = {
				...pagination,
				total: pagination.total + 1,
				totalPages: Math.ceil((pagination.total + 1) / pagination.limit)
			};

			if (pagination.page !== 1) return;

			try {
				const { data: record } = await api.serviceRequests.getOne(event.requestId);
				requests = [record, ...requests].slice(0, pagination.limit);
			} catch {}
		});
	});

	let subscriptionKey = $derived(
		requests
			.filter((row) => NON_TERMINAL.includes(row.status))
			.map((row) => row.id)
			.join(',')
	);

	$effect(() => {
		const ids = subscriptionKey ? subscriptionKey.split(',') : [];
		const unsubscribers = ids.map((id) =>
			subscribeToRequest(id, (event) =>
				applyProgress(event.requestId, event.status, event.completed)
			)
		);
		return () => {
			for (const unsubscribe of unsubscribers) unsubscribe();
		};
	});
</script>

<svelte:head><title>Operator — HeavenlyQR</title></svelte:head>

<div class="mx-auto flex max-w-5xl flex-col gap-4 p-8">
	<a
		href={resolve('/')}
		class="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
	>
		<ArrowLeftIcon class="size-3.5" />
		Back
	</a>

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center justify-between gap-2">
				Service Requests
				<Badge variant={connected ? 'default' : 'secondary'} class="gap-1.5">
					{#if connected}
						<WifiIcon class="size-3.5" />
						Live
					{:else}
						<WifiOffIcon class="size-3.5" />
						Connecting…
					{/if}
				</Badge>
			</Card.Title>
			<Card.Description>
				All requests across every operator, updated live as work progresses.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if requests.length === 0}
				<p class="py-8 text-center text-sm text-muted-foreground">No service requests yet.</p>
			{:else}
				<div class="overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>URL</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head class="w-56">Progress</Table.Head>
								<Table.Head>Created</Table.Head>
								<Table.Head class="text-right">Actions</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each requests as request (request.id)}
								<Table.Row>
									<Table.Cell class="max-w-64 truncate font-medium">
										<a
											href={resolve('/operator/[id]', { id: request.id })}
											title={request.url}
											class="hover:underline"
										>
											{request.url}
										</a>
									</Table.Cell>
									<Table.Cell>
										<Badge variant={STATUS_VARIANT[request.status]}>{request.status}</Badge>
									</Table.Cell>
									<Table.Cell>
										<div class="flex flex-col gap-1">
											<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
												<div
													class="h-full rounded-full bg-primary transition-all duration-300"
													style={`width: ${progressPercent(request)}%`}
												></div>
											</div>
											<span class="text-xs text-muted-foreground">
												{request.completedItems} / {request.totalItems}
												{#if request.failedItems > 0}
													&middot; {request.failedItems} failed
												{/if}
											</span>
										</div>
									</Table.Cell>
									<Table.Cell class="text-sm text-muted-foreground">
										{formatDate(request.createdAt)}
									</Table.Cell>
									<Table.Cell class="flex justify-end gap-2">
										<Button
											variant="outline"
											size="sm"
											class="gap-1.5"
											href={resolve('/operator/[id]', { id: request.id })}
										>
											<EyeIcon class="size-3.5" />
											View
										</Button>
										{#if NON_TERMINAL.includes(request.status)}
											<Button
												variant="outline"
												size="sm"
												class="gap-1.5"
												disabled={cancellingIds.has(request.id)}
												onclick={() => cancelRequest(request.id)}
											>
												<XIcon class="size-3.5" />
												Cancel
											</Button>
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

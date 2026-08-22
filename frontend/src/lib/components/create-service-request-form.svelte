<script lang="ts">
	import LoaderIcon from '@lucide/svelte/icons/loader-2';
	import SendIcon from '@lucide/svelte/icons/send';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { CreateServiceRequestResult } from '$lib/api/types.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		validateCreateServiceRequestForm,
		type CreateServiceRequestFieldErrors
	} from '$lib/validation/service-request.js';

	type ActionResult =
		| { success: true; result: CreateServiceRequestResult; errors?: undefined }
		| {
				success?: false;
				errors?: CreateServiceRequestFieldErrors;
				message?: string;
				values?: { url: string; idRangeStart: number; idRangeEnd: number };
		  }
		| null
		| undefined;

	let {
		form,
		onCreated
	}: { form?: ActionResult; onCreated?: (result: CreateServiceRequestResult) => void } = $props();

	let url = $state('');
	let idRangeStart = $state<number | undefined>();
	let idRangeEnd = $state<number | undefined>();
	let clientErrors = $state<CreateServiceRequestFieldErrors>({});
	let submitting = $state(false);

    // zod validation errors
	let errors = $derived({ ...clientErrors, ...(form?.errors ?? {}) });

	const handleSubmit: SubmitFunction = ({ cancel }) => {
		const fieldErrors = validateCreateServiceRequestForm({ url, idRangeStart, idRangeEnd });
		clientErrors = fieldErrors;
		if (Object.values(fieldErrors).some(Boolean)) {
			cancel();
			return;
		}

		submitting = true;
		return async ({ result, update }) => {
			submitting = false;

			if (result.type === 'success' && result.data?.success) {
				const created = result.data.result as CreateServiceRequestResult;
				toast.success('Service request created', {
					description: `${created.totalItems} QR code${created.totalItems === 1 ? '' : 's'} queued for ${created.url}`
				});
				url = '';
				idRangeStart = undefined;
				idRangeEnd = undefined;
				clientErrors = {};
				onCreated?.(created);
			} else if (result.type === 'failure' && typeof result.data?.message === 'string') {
				toast.error(result.data.message);
			} else if (result.type === 'error') {
				toast.error('Failed to create service request');
			}

			await update();
		};
	};
</script>

<form class="flex flex-col gap-4" method="POST" use:enhance={handleSubmit} novalidate>
	<div class="flex flex-col gap-1.5">
		<Label for="service-request-url">URL</Label>
		<Input
			id="service-request-url"
			name="url"
			type="url"
			placeholder="https://example.com/products"
			bind:value={url}
			aria-invalid={!!errors.url}
			disabled={submitting}
		/>
		{#if errors.url}
			<p class="text-sm text-destructive">{errors.url}</p>
		{/if}
	</div>

	<div class="grid grid-cols-2 gap-4">
		<div class="flex flex-col gap-1.5">
			<Label for="service-request-id-start">ID range start</Label>
			<Input
				id="service-request-id-start"
				name="idRangeStart"
				type="number"
				min="0"
				step="1"
				placeholder="1"
				bind:value={idRangeStart}
				aria-invalid={!!errors.idRangeStart}
				disabled={submitting}
			/>
			{#if errors.idRangeStart}
				<p class="text-sm text-destructive">{errors.idRangeStart}</p>
			{/if}
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="service-request-id-end">ID range end</Label>
			<Input
				id="service-request-id-end"
				name="idRangeEnd"
				type="number"
				min="0"
				step="1"
				placeholder="100"
				bind:value={idRangeEnd}
				aria-invalid={!!errors.idRangeEnd}
				disabled={submitting}
			/>
			{#if errors.idRangeEnd}
				<p class="text-sm text-destructive">{errors.idRangeEnd}</p>
			{/if}
		</div>
	</div>

	<Button type="submit" disabled={submitting} class="gap-1.5">
		{#if submitting}
			<LoaderIcon class="size-4 animate-spin" />
			Creating…
		{:else}
			<SendIcon class="size-4" />
			Create request
		{/if}
	</Button>
</form>

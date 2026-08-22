import { fail } from '@sveltejs/kit';
import { ClientResponseError } from '$lib/api/client.js';
import type { HealthStatus } from '$lib/api/types.js';
import type { CreateServiceRequestFieldErrors } from '$lib/validation/service-request.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	let health: HealthStatus | null = null;
	try {
		health = await locals.api.health.check();
	} catch {
	}
	return { health };
};

function toNumber(value: FormDataEntryValue | null): number {
	if (value === null || value === '') return NaN;
	return Number(value);
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const url = String(formData.get('url') ?? '').trim();
		const idRangeStart = toNumber(formData.get('idRangeStart'));
		const idRangeEnd = toNumber(formData.get('idRangeEnd'));
		const values = { url, idRangeStart, idRangeEnd };

		const presenceErrors: CreateServiceRequestFieldErrors = {};
		if (!url) presenceErrors.url = 'URL is required';
		if (Number.isNaN(idRangeStart)) presenceErrors.idRangeStart = 'Required';
		if (Number.isNaN(idRangeEnd)) presenceErrors.idRangeEnd = 'Required';
		if (Object.keys(presenceErrors).length > 0) {
			return fail(400, { errors: presenceErrors, values });
		}

		try {
			const result = await locals.api.serviceRequests.create({ url, idRangeStart, idRangeEnd });
			return { success: true as const, result };
		} catch (error) {
			if (error instanceof ClientResponseError && error.status === 400) {
				const details = error.data as { fieldErrors?: Record<string, string[]> } | undefined;
				const fieldErrors = details?.fieldErrors ?? {};
				const errors: CreateServiceRequestFieldErrors = {
					url: fieldErrors.url?.[0],
					idRangeStart: fieldErrors.idRangeStart?.[0],
					idRangeEnd: fieldErrors.idRangeEnd?.[0]
				};
				return fail(400, { errors, values });
			}

			const message =
				error instanceof ClientResponseError ? error.message : 'Failed to create service request';
			const status = error instanceof ClientResponseError && error.status > 0 ? error.status : 500;
			return fail(status, { message, values });
		}
	}
};

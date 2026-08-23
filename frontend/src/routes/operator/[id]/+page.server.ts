import { error } from '@sveltejs/kit';
import { ClientResponseError } from '$lib/api/client.js';
import { QR_ITEM_STATUSES, type ListResult, type QrItemRecord } from '$lib/api/types.js';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const pageParam = Number(url.searchParams.get('page'));
	const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

	const statusParam = url.searchParams.get('status');
	const status = QR_ITEM_STATUSES.find((value) => value === statusParam);

	try {
		const { data: request } = await locals.api.serviceRequests.getOne(params.id);

		let items: ListResult<QrItemRecord>;
		try {
			items = await locals.api.serviceRequests.items(params.id, {
				page,
				limit: PAGE_SIZE,
				status
			});
		} catch {
			items = { data: [], pagination: { page, limit: PAGE_SIZE, total: 0, totalPages: 0 } };
		}

		return {
			request,
			items: items.data,
			pagination: items.pagination,
			status: status ?? null
		};
	} catch (err) {
		if (err instanceof ClientResponseError && err.status === 404) {
			error(404, 'Service request not found');
		}
		error(502, 'Failed to load service request');
	}
};

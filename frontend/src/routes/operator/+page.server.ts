import { REQUEST_STATUSES, type ListResult, type ServiceRequestRecord } from '$lib/api/types.js';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ locals, url }) => {
	const pageParam = Number(url.searchParams.get('page'));
	const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

	const statusParam = url.searchParams.get('status');
	const status = REQUEST_STATUSES.find((value) => value === statusParam);

	let result: ListResult<ServiceRequestRecord>;
	try {
		result = await locals.api.serviceRequests.list({
			page,
			limit: PAGE_SIZE,
			status,
			sortBy: 'createdAt',
			sortOrder: 'desc'
		});
	} catch {
		result = { data: [], pagination: { page, limit: PAGE_SIZE, total: 0, totalPages: 0 } };
	}

	return { requests: result.data, pagination: result.pagination };
};

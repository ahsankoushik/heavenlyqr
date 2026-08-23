import { REQUEST_STATUSES, type ListResult, type ServiceRequestRecord } from '$lib/api/types.js';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 50;
const SORT_FIELDS = ['createdAt', 'updatedAt'] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;

export const load: PageServerLoad = async ({ locals, url }) => {
	const pageParam = Number(url.searchParams.get('page'));
	const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

	const statusParam = url.searchParams.get('status');
	const status = REQUEST_STATUSES.find((value) => value === statusParam);

	const search = url.searchParams.get('search')?.trim() || undefined;

	const sortByParam = url.searchParams.get('sortBy');
	const sortBy = SORT_FIELDS.find((value) => value === sortByParam) ?? 'createdAt';

	const sortOrderParam = url.searchParams.get('sortOrder');
	const sortOrder = SORT_ORDERS.find((value) => value === sortOrderParam) ?? 'desc';

	let result: ListResult<ServiceRequestRecord>;
	try {
		result = await locals.api.serviceRequests.list({
			page,
			limit: PAGE_SIZE,
			status,
			search,
			sortBy,
			sortOrder
		});
	} catch {
		result = { data: [], pagination: { page, limit: PAGE_SIZE, total: 0, totalPages: 0 } };
	}

	return {
		requests: result.data,
		pagination: result.pagination,
		filters: { status: status ?? null, search: search ?? null, sortBy, sortOrder }
	};
};

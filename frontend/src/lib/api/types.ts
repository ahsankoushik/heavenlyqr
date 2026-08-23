export const REQUEST_STATUSES = [
	'PENDING',
	'PROCESSING',
	'COMPLETED',
	'PARTIALLY_FAILED',
	'FAILED',
	'CANCELLED'
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const QR_ITEM_STATUSES = [
	'PENDING',
	'PROCESSING',
	'COMPLETED',
	'FAILED',
	'CANCELLED'
] as const;

export type QrItemStatus = (typeof QR_ITEM_STATUSES)[number];

export interface ServiceRequestRecord {
	id: string;
	url: string;
	idRangeStart: number;
	idRangeEnd: number;
	status: RequestStatus;
	totalItems: number;
	completedItems: number;
	failedItems: number;
	createdAt: string;
	updatedAt: string;
}

// POST /service/requests replies with a subset of ServiceRequestRecord
export interface CreateServiceRequestResult {
	id: string;
	url: string;
	idRangeStart: number;
	idRangeEnd: number;
	status: RequestStatus;
	totalItems: number;
	createdAt: string;
}

export interface QrItemRecord {
	id: string;
	itemId: number;
	status: QrItemStatus;
	imagePath: string | null;
	errorMessage: string | null;
	attempts: number;
	serviceRequestId: string;
	createdAt: string;
	updatedAt: string;
}

export interface Pagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface ListResult<T> {
	data: T[];
	pagination: Pagination;
}

export interface CreateServiceRequestInput {
	url: string;
	idRangeStart: number;
	idRangeEnd: number;
}

export interface ListServiceRequestsParams {
	page?: number;
	limit?: number;
	status?: RequestStatus;
	search?: string;
	sortBy?: 'createdAt' | 'updatedAt';
	sortOrder?: 'asc' | 'desc';
}

export interface ListQrItemsParams {
	page?: number;
	limit?: number;
	status?: QrItemStatus;
}

export interface CancelServiceRequestResult {
	message: string;
	data: ServiceRequestRecord;
}

export interface HealthStatus {
	status: 'ok' | 'degraded';
	uptimeSeconds: number;
	dependencies: {
		database: 'up' | 'down';
		redis: 'up' | 'down';
	};
}

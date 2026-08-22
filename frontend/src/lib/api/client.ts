import { env } from '$env/dynamic/public';
import type {
	CancelServiceRequestResult,
	CreateServiceRequestInput,
	CreateServiceRequestResult,
	HealthStatus,
	ListQrItemsParams,
	ListResult,
	ListServiceRequestsParams,
	QrItemRecord,
	ServiceRequestRecord
} from './types.js';

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export interface SendOptions extends Omit<RequestInit, 'body' | 'method'> {
	method?: string;
	body?: unknown;
	query?: QueryParams;
}

export class ClientResponseError extends Error {
	readonly url: string;
	readonly status: number;
	readonly data: unknown;
	readonly isAbort: boolean;
	readonly originalError?: unknown;

	constructor(options: {
		url: string;
		status: number;
		message: string;
		data?: unknown;
		isAbort?: boolean;
		originalError?: unknown;
	}) {
		super(options.message);
		this.name = 'ClientResponseError';
		this.url = options.url;
		this.status = options.status;
		this.data = options.data;
		this.isAbort = options.isAbort ?? false;
		this.originalError = options.originalError;
	}
}

const DEFAULT_BASE_URL = 'http://localhost:4000';
const API_PREFIX = '/api/v1';

abstract class BaseService {
	constructor(protected readonly client: ApiClient) {}
}

export class ServiceRequestsService extends BaseService {
	private readonly basePath = '/service/requests';

	list(
		params: ListServiceRequestsParams = {},
		options?: SendOptions
	): Promise<ListResult<ServiceRequestRecord>> {
		return this.client.send(this.basePath, { ...options, query: params as QueryParams });
	}

	getOne(id: string, options?: SendOptions): Promise<{ data: ServiceRequestRecord }> {
		return this.client.send(`${this.basePath}/${id}`, options);
	}

	create(
		input: CreateServiceRequestInput,
		options?: SendOptions
	): Promise<CreateServiceRequestResult> {
		return this.client.send(this.basePath, { ...options, method: 'POST', body: input });
	}

	cancel(id: string, options?: SendOptions): Promise<CancelServiceRequestResult> {
		return this.client.send(`${this.basePath}/${id}/cancel`, { ...options, method: 'POST' });
	}

	items(
		id: string,
		params: ListQrItemsParams = {},
		options?: SendOptions
	): Promise<ListResult<QrItemRecord>> {
		return this.client.send(`${this.basePath}/${id}/items`, {
			...options,
			query: params as QueryParams
		});
	}

	itemImageUrl(id: string, itemId: number): string {
		return this.client.buildUrl(`${this.basePath}/${id}/items/${itemId}/image`);
	}

	getZipDownloadUrl(id: string): string {
		return this.client.buildUrl(`${this.basePath}/${id}/download`);
	}
}

export class HealthService extends BaseService {
	check(options?: SendOptions): Promise<HealthStatus> {
		return this.client.send('/health/check', options);
	}
}

export class ApiClient {
	readonly baseUrl: string;
	private readonly fetchFn: typeof fetch;

	constructor(baseUrl?: string, fetchFn?: typeof fetch) {
		const resolved = baseUrl ?? env.PUBLIC_API_URL ?? DEFAULT_BASE_URL;
		this.baseUrl = resolved.replace(/\/+$/, '');
		this.fetchFn = fetchFn ?? fetch;
	}

	buildUrl(path: string, query?: QueryParams): string {
		const url = new URL(this.baseUrl + API_PREFIX + (path.startsWith('/') ? path : `/${path}`));
		if (query) {
			for (const [key, value] of Object.entries(query)) {
				if (value !== undefined && value !== null) {
					url.searchParams.set(key, String(value));
				}
			}
		}
		return url.toString();
	}

	async send<T>(path: string, options: SendOptions = {}): Promise<T> {
		const { method = 'GET', body, query, headers, ...rest } = options;
		const url = this.buildUrl(path, query);

		const init: RequestInit = {
			...rest,
			method,
			headers: {
				...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
				...headers
			}
		};
		if (body !== undefined) {
			init.body = JSON.stringify(body);
		}

		let response: Response;
		try {
			response = await this.fetchFn(url, init);
		} catch (error) {
			const isAbort = error instanceof DOMException && error.name === 'AbortError';
			throw new ClientResponseError({
				url,
				status: 0,
				message: isAbort ? 'Request was aborted.' : 'Failed to reach the server.',
				isAbort,
				originalError: error
			});
		}

		const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
		const payload = isJson ? await response.json().catch(() => undefined) : undefined;

		if (!response.ok) {
			const errorBody = payload as { error?: { message?: string; details?: unknown } } | undefined;
			throw new ClientResponseError({
				url,
				status: response.status,
				message: errorBody?.error?.message ?? response.statusText ?? 'Request failed.',
				data: errorBody?.error?.details
			});
		}

		return payload as T;
	}

	get serviceRequests(): ServiceRequestsService {
		return new ServiceRequestsService(this);
	}

	get health(): HealthService {
		return new HealthService(this);
	}
}

export const api = new ApiClient();

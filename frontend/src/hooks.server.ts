import type { Handle } from '@sveltejs/kit';
import { ApiClient } from '$lib/api/client.js';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.api = new ApiClient(undefined, event.fetch);
	return resolve(event);
};

import type { Handle } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { ApiClient } from '$lib/api/client.js';

// inside docker it wont be able to reach to public ip 
const serverApiUrl = privateEnv.API_INTERNAL_URL || publicEnv.PUBLIC_API_URL || undefined;

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.api = new ApiClient(serverApiUrl, event.fetch);
	return resolve(event);
};

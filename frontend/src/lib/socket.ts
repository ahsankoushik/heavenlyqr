import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { io, type Socket } from 'socket.io-client';

export type ProgressStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface ProgressEvent {
	requestId: string;
	status: ProgressStatus;
	completed: number;
	startEvent: boolean;
}

const API_URL = env.PUBLIC_API_URL ?? 'http://localhost:4000';

let socket: Socket | undefined;

// single conn
function getSocket(): Socket {
	if (!browser) {
		throw new Error('getSocket() is browser-only (no WebSocket during SSR)');
	}
	if (!socket) {
		socket = io(API_URL, { transports: ['websocket'], autoConnect: true });
	}
	return socket;
}

export function subscribeToRequest(
	requestId: string,
	onProgress: (event: ProgressEvent) => void
): () => void {
	const socket = getSocket();

	const handleProgress = (event: ProgressEvent): void => {
		if (event.requestId === requestId) {
			onProgress(event);
		}
	};

	socket.emit('subscribe:request', requestId);
	socket.on('progress', handleProgress);

	return () => {
		socket.off('progress', handleProgress);
		socket.emit('unsubscribe:request', requestId);
	};
}

export function onConnectionChange(callback: (connected: boolean) => void): () => void {
	const socket = getSocket();

	const handleConnect = (): void => callback(true);
	const handleDisconnect = (): void => callback(false);

	socket.on('connect', handleConnect);
	socket.on('disconnect', handleDisconnect);
	callback(socket.connected);

	return () => {
		socket.off('connect', handleConnect);
		socket.off('disconnect', handleDisconnect);
	};
}

export function onOperatorEvent(callback: (event: ProgressEvent) => void): () => void {
	const socket = getSocket();

	socket.on('operator', callback);

	return () => {
		socket.off('operator', callback);
	};
}

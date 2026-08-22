export const MAX_RANGE_SIZE = 5000;

export interface CreateServiceRequestFormValues {
	url: string;
	idRangeStart: number | undefined;
	idRangeEnd: number | undefined;
}

export type CreateServiceRequestFieldErrors = Partial<
	Record<keyof CreateServiceRequestFormValues, string>
>;

function isValidUrl(value: string): boolean {
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
}

export function validateCreateServiceRequestForm(
	values: CreateServiceRequestFormValues
): CreateServiceRequestFieldErrors {
	const errors: CreateServiceRequestFieldErrors = {};

	const url = values.url.trim();
	if (!url) {
		errors.url = 'URL is required';
	} else if (!isValidUrl(url)) {
		errors.url = 'url must be a valid URL';
	}

	for (const field of ['idRangeStart', 'idRangeEnd'] as const) {
		const value = values[field];
		if (value === undefined || Number.isNaN(value)) {
			errors[field] = 'Required';
		} else if (!Number.isInteger(value) || value < 0) {
			errors[field] = 'Must be a whole number, zero or greater';
		}
	}

	if (
		!errors.idRangeStart &&
		!errors.idRangeEnd &&
		values.idRangeStart !== undefined &&
		values.idRangeEnd !== undefined
	) {
		if (values.idRangeEnd < values.idRangeStart) {
			errors.idRangeEnd = 'idRangeEnd must be greater than or equal to idRangeStart';
		} else if (values.idRangeEnd - values.idRangeStart + 1 > MAX_RANGE_SIZE) {
			errors.idRangeEnd = `Range cannot exceed ${MAX_RANGE_SIZE} IDs`;
		}
	}

	return errors;
}

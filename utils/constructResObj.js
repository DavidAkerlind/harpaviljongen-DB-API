export function constructResObj(status, message, success, data) {
	if (data) {
		return {
			status: status,
			message: message,
			success: success,
			data: data,
		};
	} else {
		return { status: status, message: message, success: success };
	}
}

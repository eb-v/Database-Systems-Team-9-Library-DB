const BASE_URL = import.meta.env.VITE_API_URL || '';

export function apiFetch(path, options = {}) {
    return fetch(`${BASE_URL}${path}`, options);
}

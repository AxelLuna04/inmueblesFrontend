const API_BASE = import.meta.env.VITE_API_BASE + "/v1" || '/api/v1';
const URL_POST_PUBLICATION = `${API_BASE}/publicaciones`;

export async function postPublication(data) {
    const res = await fetch(URL_POST_PUBLICATION, {
        method: "POST",
        headers: {
            Authorization: "Bearer " + localStorage.getItem("accessToken"),
        },
        body: data,
    });

    if (!res.ok){
        const text = await res.text().catch(() => "");
        if (res.status === 500) {
            console.error(`Error del servidor - (${res.status}): ${text}`)
            throw new ErrorApi("Error interno del servidor. Inténtelo de nuevo más tarde.")
        } else {
            throw new ErrorApi(res.text);
        }
    }
}
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getRandomNote = () => api.get("/api/notes/random");
export const getAllNotes = () => api.get("/api/notes");
export const getCategories = () => api.get("/api/categories");

export const createNote = (noteData, imageFile) => {
  const formData = new FormData();

  formData.append("note", JSON.stringify(noteData));

  if (imageFile) {
    formData.append("image", imageFile);
  }

  return api.post("/api/notes", formData);
};

export const getCollectedNotes = (userId) =>
  api.get(`/api/collections?userId=${userId}`);

export const collectNote = (noteId, userId) =>
  api.post(`/api/collections/${noteId}?userId=${userId}`);

export const getCollectionCount = (userId) =>
  api.get(`/api/collections/count?userId=${userId}`);

export default api;
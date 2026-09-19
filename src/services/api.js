import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getRandomNote = () => api.get("/notes/random");
export const getAllNotes = () => api.get("/notes");
export const getCategories = () => api.get("/categories");
export const createNote = (noteData, imageFile) => {
  const formData = new FormData();

  formData.append("note", JSON.stringify(noteData));

  if (imageFile) {
    formData.append("image", imageFile);
  }

  return api.post("/notes", formData);
};

export const getCollectedNotes = (userId) =>
  api.get(`/collections?userId=${userId}`);

export const collectNote = (noteId, userId) =>
  api.post(`/collections/${noteId}?userId=${userId}`);

export const getCollectionCount = (userId) =>
  api.get(`/collections/count?userId=${userId}`);

export default api;
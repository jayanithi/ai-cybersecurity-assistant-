import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:5000",
  headers: {
    "Content-Type": "application/json"
  }
});

export const loginUser = async (email, password) => {
  const response = await API.post("/auth/login", {
    email,
    password
  });

  return response.data;
};

export const registerUser = async (
  username,
  email,
  password
) => {
  const response = await API.post("/auth/register", {
    username,
    email,
    password
  });

  return response.data;
};

export default API;
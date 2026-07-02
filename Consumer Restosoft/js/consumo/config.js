export const API_BASE = "http://localhost:8080/api";

// export const token =
//   "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbkByZXN0b3NvZnQuY29tIiwidXN1YXJpb0lkIjoxNiwiZW1wcmVzYUlkIjoxLCJyb2wiOiJBZG1pbmlzdHJhZG9yIiwiaWF0IjoxNzgyOTQwODQ0LCJleHAiOjE3ODMwMjcyNDR9.rmSS8Gj8hqFm1oQt3CvE3AhImznGGBmPvVpvZOf1RpU";

export const token = localStorage.getItem("token") || localStorage.getItem("token_cliente");

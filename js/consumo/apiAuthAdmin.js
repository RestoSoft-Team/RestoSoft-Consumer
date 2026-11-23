import { API_BASE } from "./config";

export const apiAuthAdmin = {

   login: async () => {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
 
     if (!response.ok) {
       throw new Error("Error al iniciar sesión.");
     }
 
     return await response.json();
   }

}
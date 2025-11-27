// src/environments/environment.prod.ts
export const environment = {
  production: true,
  // En producción, usa el proxy de Nginx hacia Kong
  apiUrl: '/api/productos'
};

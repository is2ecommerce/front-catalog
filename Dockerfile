# Etapa 1: Build de Angular
FROM node:22-alpine AS build
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente y construir
COPY . .
RUN npm run build

# Etapa 2: Servidor Nginx
FROM nginx:alpine

# Copiar los archivos compilados
COPY --from=build /app/dist/proyecto-software /usr/share/nginx/html

# Copiar configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

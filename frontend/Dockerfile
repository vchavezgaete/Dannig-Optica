# Frontend Dockerfile para Dannig Ã“ptica
# Railway construye desde el Root Directory "frontend", por lo que el contexto es frontend/
# Ya estamos dentro de frontend/, asÃ­ que las rutas NO deben incluir el prefijo frontend/
FROM node:18-alpine as build

WORKDIR /app

ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm install
COPY . .

RUN cp nginx.conf /tmp/nginx.conf || (echo "ERROR: nginx.conf no encontrado" && ls -la && exit 1)
RUN npm run build
RUN test -f dist/index.html || (echo "ERROR: index.html no generado en build" && ls -la dist/ && exit 1)

FROM nginx:alpine

RUN apk add --no-cache bash && rm -rf /var/cache/apk/*

COPY --from=build /app/dist /usr/share/nginx/html
RUN ls -la /usr/share/nginx/html && test -f /usr/share/nginx/html/index.html || (echo "ERROR: index.html no encontrado despuÃ©s de copiar" && exit 1)

COPY --from=build /tmp/nginx.conf /etc/nginx/conf.d/default.conf
RUN nginx -t || (echo "ERROR: ConfiguraciÃ³n de nginx invÃ¡lida" && cat /etc/nginx/conf.d/default.conf && exit 1)

COPY --from=build /app/scripts/start-nginx.sh /start-nginx.sh
RUN chmod +x /start-nginx.sh || echo "Script no encontrado, usando comando directo"

EXPOSE 80

CMD ["/bin/sh", "-c", "if [ -f /start-nginx.sh ]; then exec /start-nginx.sh; else echo 'ðŸš€ Iniciando nginx...' && nginx -t && exec nginx -g 'daemon off;'; fi"]

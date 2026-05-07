FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# These are baked into the JS bundle at build time
ARG VITE_ENTERPRISE_URL=http://localhost:3000
ARG VITE_CATALOG_URL=http://localhost:3001
ARG VITE_CART_URL=http://localhost:3002
ARG VITE_CHECKOUT_URL=http://localhost:3003
ARG VITE_ORDERS_URL=http://localhost:3004

ENV VITE_ENTERPRISE_URL=$VITE_ENTERPRISE_URL
ENV VITE_CATALOG_URL=$VITE_CATALOG_URL
ENV VITE_CART_URL=$VITE_CART_URL
ENV VITE_CHECKOUT_URL=$VITE_CHECKOUT_URL
ENV VITE_ORDERS_URL=$VITE_ORDERS_URL

RUN npm run build

# ---- Serve ----
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

FROM node:20-alpine AS builder

WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV NPM_CONFIG_IGNORE_SCRIPTS=true

# Install only necessary build dependencies
RUN apk add --no-cache openssl python3

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN npm run build

FROM node:20-alpine AS production

WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV NPM_CONFIG_IGNORE_SCRIPTS=true

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Install only the minimal dependencies needed for runtime
RUN apk add --no-cache openssl

# Copy package files and install production dependencies
COPY package*.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && \
    npm cache clean --force

# Copy only necessary files
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/src/templates ./dist/templates
COPY --from=builder /usr/src/app/tsconfig.json ./tsconfig.json
COPY entrypoint.sh ./entrypoint.sh

# Set permissions and switch to non-root user
RUN chmod +x ./entrypoint.sh && \
    chown -R nestjs:nodejs /usr/src/app
USER nestjs

EXPOSE 80

ENTRYPOINT [ "./entrypoint.sh" ]
CMD [ "npm", "run", "start:prod" ]
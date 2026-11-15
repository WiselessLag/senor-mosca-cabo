FROM node:22-bookworm-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts index.html ./
COPY 3d ./3d
COPY src ./src
COPY public ./public
RUN npm run build

FROM python:3.12-slim-bookworm
ENV PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
COPY requirements.txt requirements-flywire.txt ./
RUN pip install --no-cache-dir -r requirements-flywire.txt
RUN git clone --filter=blob:none --no-checkout https://github.com/philshiu/Drosophila_brain_model.git upstream \
    && git -C upstream sparse-checkout set --no-cone /model.py /utils.py /Readme.md /LICENSE /environment.yml /environment_full.yml /Completeness_783.csv /Connectivity_783.parquet \
    && git -C upstream checkout --detach 91bdd1e7dcf193f3e7ca5a8933497fcef63b7960 \
    && rm -rf upstream/.git
COPY backend ./backend
COPY --from=frontend /app/dist ./dist
EXPOSE 8765
CMD ["sh", "-c", "test -n \"$MOSCA_PASSWORD\" || { echo 'MOSCA_PASSWORD is required'; exit 1; }; exec python -m uvicorn backend.api:app --host 0.0.0.0 --port 8765"]

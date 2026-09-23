FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY index.html styles.css app.js map-data.js logo.svg ./site/
COPY floor-2-walls.svg floor-3-walls.svg ./site/

ENV DATA_DIR=/data
ENV SITE_ROOT=/app/site
ENV TZ=Asia/Yekaterinburg

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]

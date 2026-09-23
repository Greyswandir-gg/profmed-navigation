# ПрофМед — навигация пациента

Сайт маршрутов по клинике: https://profmed.crimsonblomhost.ru

## Запуск на сервере

Нужны Docker, Docker Compose и HTTPS-прокси (Caddy или nginx) на тот же Docker-сеть, что и контейнер.

```bash
git clone https://github.com/Greyswandir-gg/profmed-navigation.git /opt/profmed-navigation
cd /opt/profmed-navigation
cp .env.example .env
```

В `.env` укажите токен того же Telegram-бота и chat id, куда слать статистику и ответы опроса:

```
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

Сеть в `docker-compose.yml` сейчас `localai_default`. Если на новом сервере сеть называется иначе — поправьте имя, либо создайте её:

```bash
docker network create localai_default
docker compose up -d --build
```

Проксируйте хост на контейнер `profmed-navigation:8080`. Пример для Caddy:

```
profmed.your-domain.ru {
    reverse_proxy profmed-navigation:8080
}
```

Скрипт `deploy/install.sh` рассчитан на текущий сервер (Caddy addon в `/root/n8n-install`). На новом сервере достаточно `docker compose up -d --build` и своего прокси.

## Что приходит в бота

Все сообщения с этого сайта начинаются с `[ПрофМед]`:

- ответы опроса — сразу;
- статистика посещений за 8:00–14:00 по Екатеринбургу — каждый день после 14:00.

# Выкладка «Отчётика» в Yandex Cloud

Один шлюз API Gateway `otchetik` раздаёт веб-версию из бакета `obyektiv-web` и пересылает
`/api/*` и `/photos` на сервер команды `http://217.18.63.89:8000`. Описание: `apigw.yaml`.
Адрес шлюза: `https://<id>.apigw.yandexcloud.net/obyektiv/` (id печатает `yc` при создании).

## Разовая настройка (один раз на машину и облако)

    curl -sSL https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash   # yc CLI
    exec -l $SHELL
    yc init                                                                       # вход через браузер, выбор облака и каталога

    yc storage bucket create --name obyektiv-web
    yc iam service-account create --name otchetik-gw
    yc resource-manager folder add-access-binding "$(yc config get folder-id)" \
      --role storage.viewer --subject "serviceAccount:$(yc iam service-account get otchetik-gw --format json | python3 -c 'import json,sys;print(json.load(sys.stdin)["id"])')"
    yc iam access-key create --service-account-name otchetik-gw     # key_id и secret — в aws configure

    aws configure --profile yc      # Access Key = key_id, Secret = secret, region ru-central1, output json

В `apigw.yaml` заменить `SERVICE_ACCOUNT_ID` на id из `yc iam service-account get otchetik-gw`.

    yc serverless api-gateway create --name otchetik --spec deploy/apigw.yaml   # печатает domain

## Каждая выкладка

    npm run deploy:web     # сборка + заливка dist/ в бакет
    npm run deploy:gw      # только если менялся apigw.yaml

Проверка: `curl -sI https://<id>.apigw.yandexcloud.net/obyektiv/` → 200, `text/html`;
`curl -s https://<id>.apigw.yandexcloud.net/api/foreman/objects` → тот же JSON, что у сервера.

## Если параметры запроса не доходят до сервера

`GET /api/foreman/object/…/schedule?brigade_id=&date=` должен вернуть расписание. Если
шлюз отдаёт 422/400, значит query-параметры не пересылаются: в `apigw.yaml` у маршрута
`/api/{path+}` добавить

    parameters:
      - { name: brigade_id, in: query, required: false, schema: { type: string } }
      - { name: date, in: query, required: false, schema: { type: string } }
      - { name: object_id, in: query, required: false, schema: { type: string } }
      - { name: uuids, in: query, required: false, schema: { type: string } }

и в интеграцию `query: { brigade_id: '{brigade_id}', date: '{date}', object_id: '{object_id}', uuids: '{uuids}' }`;
у `/photos` — параметры `limit`, `offset` тем же способом.

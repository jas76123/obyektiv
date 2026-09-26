# Выкладка «Отчётика» в Yandex Cloud

Один шлюз API Gateway `otchetik` раздаёт веб-версию из бакета `obyektiv-web` и пересылает
`/api/*` и `/photos` на сервер команды `http://217.18.63.89:8000`. Описание: `apigw.yaml`.
Адрес шлюза: `https://<id>.apigw.yandexcloud.net/obyektiv/` (id печатает `yc` при создании).

## Разовая настройка (один раз на машину и облако)

    curl -sSL https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash   # yc CLI
    exec -l $SHELL
    yc init                                                                       # вход через браузер, выбор облака и каталога

    yc storage bucket create --name obyektiv-web

Два сервисных аккаунта: шлюз только читает бакет, заливка — читает и пишет. Один и
тот же ключ с правом записи в интеграции API Gateway был бы лишним риском, поэтому
права разведены.

    yc iam service-account create --name otchetik-gw
    yc resource-manager folder add-access-binding "$(yc config get folder-id)" \
      --role storage.viewer --subject "serviceAccount:$(yc iam service-account get otchetik-gw --format json | python3 -c 'import json,sys;print(json.load(sys.stdin)["id"])')"

    yc iam service-account create --name otchetik-deploy
    yc resource-manager folder add-access-binding "$(yc config get folder-id)" \
      --role storage.editor --subject "serviceAccount:$(yc iam service-account get otchetik-deploy --format json | python3 -c 'import json,sys;print(json.load(sys.stdin)["id"])')"
    yc iam access-key create --service-account-name otchetik-deploy     # key_id и secret — в aws configure

    aws configure --profile yc      # Access Key = key_id, Secret = secret, region ru-central1, output json

aws-cli с версии 2.23 по умолчанию шлёт CRC-контрольные суммы; если `npm run deploy:web`
падает с ошибкой про checksum, в `~/.aws/config` в секцию `[profile yc]` добавить
`request_checksum_calculation = when_required` и `response_checksum_validation = when_required`
(на живом Yandex Object Storage не проверено).

В `apigw.yaml` заменить `SERVICE_ACCOUNT_ID` на id из `yc iam service-account get otchetik-gw`
(`otchetik-gw` — read-only, только для шлюза; ключ для `aws configure` — от `otchetik-deploy`).

    yc serverless api-gateway create --name otchetik --spec deploy/apigw.yaml   # печатает domain

## Каждая выкладка

    npm run deploy:web     # сборка + заливка dist/ в бакет
    npm run deploy:gw      # только если менялся apigw.yaml

`deploy:web` отдельной командой перезаливает `index.html` с `--cache-control no-cache`:
без этого браузер (Safari) может взять старый `index.html` из своего кэша, а он ссылается
на JS-бандл с уже стёртым `--delete` именем — белый экран.

Проверка: `curl -sI https://<id>.apigw.yandexcloud.net/obyektiv/` → 200, `text/html`;
`curl -s https://<id>.apigw.yandexcloud.net/api/foreman/objects` → тот же JSON, что у сервера.

После выкладки шлюза дополнительно:
- `curl -s 'https://<id>.apigw.yandexcloud.net/api/foreman/object/<object_id>/schedule?brigade_id=br-1&date=YYYY-MM-DD'`
  → расписание, не 422;
- smoke-тест multipart POST (точные поля формы — `contract/README.md` или `lib/uploadRequest.ts`):
  `curl -F photo=@x.jpg -F local_uuid=<uuid> -F task_id=<task_id> -F taken_at=<ISO> -F geo= https://<id>.apigw.yandexcloud.net/api/foreman/shots`
  → тот же ответ, что при обращении напрямую на сервер;
- `curl -sI https://<id>.apigw.yandexcloud.net/obyektiv/rating` → 200, `text/html` (проверка SPA-фолбэка).

## Если параметры запроса не доходят до сервера

`GET /api/foreman/object/…/schedule?brigade_id=&date=` должен вернуть расписание. В `apigw.yaml`
у обеих http-интеграций (`/api/{path+}` и `/photos`) уже стоит `headers: {'*': '*'}` и
`query: {'*': '*'}` — этого достаточно, чтобы query-параметры и `Content-Type` multipart-загрузки
(с boundary) доходили до сервера без перечисления параметров по одному. Если шлюз всё равно
отдаёт 422/400 — смотреть проверки выше после очередной выкладки `apigw.yaml`.

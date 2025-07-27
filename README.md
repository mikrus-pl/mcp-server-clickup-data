# MCP Server ClickUp Data – MVP

## Cel projektu
Serwer MCP umożliwia Large Language Model (LLM) dostęp do przetworzonych danych z ClickUp oraz inicjowanie synchronizacji tych danych. Projekt stanowi walidację koncepcji wykorzystania LLM do raportowania i interakcji z danymi biznesowymi.

## Kluczowe funkcjonalności (MVP)
### Narzędzia – Odczyt danych (SQLite)
- **listUsers** – pobiera listę użytkowników (ID, username)
- **getUserCurrentRate(userId)** – pobiera aktualną stawkę użytkownika
- **getUserRateHistory(userId)** – pobiera historię stawek użytkownika
- **getReportedTaskAggregates(filters)** – pobiera dane z tabeli ReportedTaskAggregates, umożliwiając filtrowanie po `clientName`, `reported_for_user_id`, `extracted_month_from_parent_name` (zwraca dane w formacie JSON array of objects)
- **listClients** – zwraca unikalną listę klientów na podstawie danych w ReportedTaskAggregates lub Tasks.custom_field_client

### Narzędzia – Wywoływanie komend CDC
- Inicjowanie synchronizacji danych przez wywołanie komend CLI z clickup-data-collector (poprzez `child_process`)

## Struktura projektu
```
├── .env                 # zmienne środowiskowe
├── .gitignore           # plik ignorowania dla GIT
├── kick-off-requirements.md # wymagania MVP
├── package.json         # zależności npm
├── server.js            # główny serwer Node.js
├── src/
│   ├── db/              # obsługa bazy danych (np. database.js)
│   ├── tools/           # narzędzia do obsługi danych i komend
│   └── utils/           # pomocnicze funkcje
├── tests/               # skrypty pomocnicze do testowania
├── docs/                # dokumentacja (uwaga: pliki w tym katalogu mogą nie być w pełni aktualne, wiedza z nich powinna być weryfikowana przed użyciem)
```

## Wymagania
- Node.js
- SQLite (baza danych lokalna)
- Dostęp do clickup-data-collector (CLI)

## Uruchomienie
1. Skonfiguruj plik `.env` z wymaganymi zmiennymi środowiskowymi.
2. Zainstaluj zależności:
   ```bash
   npm install
   ```
3. Uruchom serwer:
   ```bash
   node server.js
   ```

## Dokumentacja
Szczegółowe wymagania znajdują się w pliku `kick-off-requirements.md`.

---

Projekt MVP – wersja wstępna. Wszelkie uwagi i propozycje zmian mile widziane!

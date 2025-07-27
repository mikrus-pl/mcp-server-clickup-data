# Debugowanie serwera MCP

Ten dokument zawiera instrukcje krok po kroku dotyczące debugowania serwera MCP ClickUp Data.

## Najlepsza praktyka debugowania

Najlepszym i najskuteczniejszym sposobem debugowania serwera MCP jest użycie oficjalnego inspektora @modelcontextprotocol/inspector, który dostarcza interfejs webowy do monitorowania komunikacji między klientem a serwerem MCP.

### Instalacja @modelcontextprotocol/inspector

Możesz użyć inspektora na dwa sposoby:

1. **Bez instalacji (zalecane)** - Użyj npx do uruchomienia inspektora bez instalacji:
   ```bash
   npx @modelcontextprotocol/inspector
   ```

2. **Instalacja globalna** - Zainstaluj inspector globalnie dla trwałego dostępu:
   ```bash
   npm install -g @modelcontextprotocol/inspector
   ```

3. **Instalacja lokalna** - Dodaj inspector jako zależność do projektu:
   ```bash
   npm install --save-dev @modelcontextprotocol/inspector
   ```

### Uruchamianie debugowania

Zalecana komenda do debugowania:
```bash
npx @modelcontextprotocol/inspector node /Users/michalwasaznik/Code\ projects/MOKO/APPS_pack/mcp-server-clickup-data/server.js
```

Po uruchomieniu przejdź w przeglądarce pod adres `http://localhost:4200` aby uzyskać dostęp do interfejsu inspektora.

## Wymagania wstępne

Przed rozpoczęciem debugowania upewnij się, że masz zainstalowane:

1. **Node.js** (zalecana wersja 16.x lub nowsza)
2. **npm** (zwykle instalowany razem z Node.js)
3. **Dostęp do terminala** (np. zsh, bash)

## Instalacja

1. Otwórz terminal i przejdź do katalogu projektu:
   ```bash
   cd /Users/michalwasaznik/Code\ projects/MOKO/APPS_pack/mcp-server-clickup-data
   ```

2. Zainstaluj zależności projektu:
   ```bash
   npm install
   ```

   Ta komenda zainstaluje wszystkie wymagane paczki zdefiniowane w `package.json`, w tym:
   - `@modelcontextprotocol/sdk` - podstawowe SDK dla serwera MCP
   - `dotenv` - do zarządzania zmiennymi środowiskowymi
   - `knex` - query builder dla bazy danych
   - `sqlite3` - sterownik bazy danych SQLite

3. (Opcjonalnie) Zainstaluj inspector globalnie dla łatwiejszego dostępu:
   ```bash
   npm install -g @modelcontextprotocol/inspector
   ```

## Konfiguracja zmiennych środowiskowych

1. Skopiuj przykładowy plik konfiguracyjny:
   ```bash
   cp .env.example .env
   ```

2. Edytuj plik `.env` i uzupełnij wymagane zmienne:
   ```bash
   nano .env
   ```

   Upewnij się, że wszystkie wymagane zmienne są poprawnie ustawione, szczególnie:
   - `CLICKUP_DATA_COLLECTOR_PATH` - ścieżka do CLI clickup-data-collector
   - `DATABASE_PATH` - ścieżka do pliku bazy danych SQLite

## Uruchamianie serwera w trybie debugowania

### Podstawowe uruchomienie

Aby uruchomić serwer w trybie debugowania:

```bash
node server.js
```

### Uruchomienie z dodatkowym logowaniem

Serwer automatycznie wyświetla szczegółowe logi podczas działania. Wszystkie wiadomości są wypisywane na `stderr` z prefiksem `[MCP Server]`.

Przykładowe logi podczas prawidłowego uruchomienia:
```
[MCP Server] Initializing server: ClickUpDataServer v0.1.0
[MCP Server] Registering tool: listUsers
[MCP Server] Registering tool: getReportedTaskAggregates
[MCP Server] Registering tool: triggerUserSync
[MCP Server] All tools registered.
[MCP Server] ClickUpDataServer v0.1.0 running and connected via stdio.
[MCP Server] Waiting for MCP client requests...
```

### Debugowanie z użyciem @modelcontextprotocol/inspector (zalecana metoda)

Najlepszym sposobem debugowania serwera MCP jest użycie oficjalnego inspektora od Model Context Protocol:

```bash
npx @modelcontextprotocol/inspector node /Users/michalwasaznik/Code\ projects/MOKO/APPS_pack/mcp-server-clickup-data/server.js
```

Ta komenda:
1. Uruchamia serwer w trybie inspektora
2. Otwiera interfejs webowy inspektora na porcie 4200
3. Pozwala na monitorowanie wszystkich żądań i odpowiedzi MCP
4. Umożliwia przeglądanie zarejestrowanych narzędzi
5. Pokazuje szczegóły komunikacji między klientem a serwerem

Po uruchomieniu przejdź w przeglądarce pod adres `http://localhost:4200` aby uzyskać dostęp do interfejsu inspektora.

### Debugowanie z użyciem inspektora Node.js

Aby uzyskać bardziej zaawansowane debugowanie, możesz uruchomić serwer z inspektorem Node.js:

```bash
node --inspect server.js
```

Lub dla wersji z oczekiwaniem na debugger:

```bash
node --inspect-brk server.js
```

Następnie możesz połączyć się z debuggerem:
1. Otwórz Chrome lub Edge
2. Przejdź do `chrome://inspect` lub `edge://inspect`
3. Kliknij "Open dedicated DevTools for Node"

## Testowanie działania narzędzi

Po uruchomieniu serwera, możesz testować poszczególne narzędzia za pomocą klienta MCP lub przez bezpośrednie wywołania.

### Przykładowe narzędzia dostępne w serwerze:

1. **listUsers** - pobiera listę użytkowników
2. **getReportedTaskAggregates** - pobiera zagregowane dane zadań
3. **triggerUserSync** - inicjuje synchronizację użytkowników
4. **triggerTaskSync** - inicjuje synchronizację zadań
5. **triggerFullSync** - inicjuje pełną synchronizację
6. **purgeDatabase** - czyści bazę danych
7. **setUserHourlyRate** - ustawia stawkę godzinową użytkownika
8. **listUserHourlyRates** - wyświetla listę stawek użytkownika
9. **deactivateUserHourlyRate** - dezaktywuje stawkę użytkownika
10. **createInvoice** - tworzy fakturę
11. **listInvoices** - wyświetla listę faktur

## Rozwiązywanie typowych problemów

### Serwer nie uruchamia się

1. Sprawdź logi błędów - wszystkie błędy są wypisywane na `stderr`
2. Upewnij się, że wszystkie zależności są zainstalowane (`npm install`)
3. Sprawdź poprawność pliku `.env`
4. Sprawdź dostępność CLI clickup-data-collector

### Narzędzia nie działają

1. Sprawdź logi rejestracji narzędzi podczas uruchamiania serwera
2. Upewnij się, że odpowiednie pliki narzędzi istnieją w katalogu `src/tools/`
3. Sprawdź poprawność implementacji handlerów narzędzi

### Problemy z bazą danych

1. Sprawdź ścieżkę do bazy danych w pliku `.env`
2. Upewnij się, że proces ma prawa zapisu do katalogu z bazą danych
3. Sprawdź, czy baza danych nie jest uszkodzona

## Przydatne komendy

```bash
# Sprawdzenie wersji Node.js
node --version

# Sprawdzenie wersji npm
npm --version

# Lista zainstalowanych pakietów
npm list

# Uruchomienie z pełnym logowaniem
DEBUG=* node server.js

# Uruchomienie z inspektorem MCP (zalecana metoda debugowania)
npx @modelcontextprotocol/inspector node /Users/michalwasaznik/Code\ projects/MOKO/APPS_pack/mcp-server-clickup-data/server.js

# Sprawdzenie procesów
ps aux | grep node

# Zabicie procesu serwera
kill -9 <PID>
```

## Logi i monitoring

Wszystkie logi serwera są wypisywane na standardowe wyjście błędów (`stderr`) z prefiksem `[MCP Server]`. Dzięki temu można łatwo filtrować logi serwera od innych komunikatów.

Przykładowe poziomy logowania:
- `[MCP Server] Initializing server` - inicjalizacja serwera
- `[MCP Server] Registering tool` - rejestracja narzędzi
- `[MCP Server] CRITICAL` - błędy krytyczne
- `[MCP Server] Fatal error` - błędy fatalne

## Integracja z klientem MCP

Serwer działa w trybie stdio, co oznacza, że komunikuje się z klientem za pomocą standardowego wejścia/wyjścia. W przypadku testowania można użyć klienta MCP lub po prosty uruchomić serwer i przekazywać mu komendy ręcznie.

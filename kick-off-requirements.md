Podsumowanie Biznesowo-Techniczno-Architektoniczne dla MVP Serwera MCP
A. Cel Biznesowy:

Umożliwić LLM dostęp do odczytu przetworzonych danych z clickup-data-collector.

Umożliwić LLM inicjowanie operacji synchronizacji danych poprzez wywołanie istniejących komend CLI z clickup-data-collector.

Walidacja koncepcji użycia LLM do raportowania i interakcji z danymi.

B. Kluczowe Funkcjonalności MCP do Zaimplementowania (MVP):

Narzędzia (Tools) - Odczyt Danych (bezpośredni dostęp do SQLite):

listUsers: Pobiera listę użytkowników (ID, username).

getUserCurrentRate(userId): Pobiera aktualnie obowiązującą stawkę dla użytkownika.

getUserRateHistory(userId): Pobiera całą historię stawek dla użytkownika.

getReportedTaskAggregates(filters): Pobiera dane z tabeli ReportedTaskAggregates, umożliwiając filtrowanie po clientName, reported_for_user_id, extracted_month_from_parent_name. Zwraca dane w formacie tabelarycznym (np. JSON array of objects).

listClients: Zwraca unikalną listę klientów na podstawie danych w ReportedTaskAggregates lub Tasks.custom_field_client.

Narzędzia (Tools) - Wywoływanie Komend CDC (przez child_process):

triggerDataCollectorSync(commandName, options):

commandName: np. "sync-users", "sync-tasks", "generate-aggregates", "full-sync".

options: np. { listId: "..." } dla komend wymagających ID listy.

Narzędzie wywołuje node <ścieżka_do_cdc>/app.js ${commandName} [opcje_cdc].

Zwraca status (sukces/błąd) i ewentualnie logi z stdout/stderr.

C. Architektura Serwera MCP (MVP):

Język i Środowisko: JavaScript (Node.js).

Biblioteka MCP SDK: Oficjalny TypeScript SDK.

Transport: stdio.

Struktura Projektu: Nowy, oddzielny projekt Node.js dla serwera MCP. Będzie on traktował clickup-data-collector jako "czarną skrzynkę" dla niektórych operacji.

Interakcja z Bazą Danych SQLite (dla narzędzi odczytu):

Serwer MCP będzie miał własną, niezależną konfigurację Knex (lub bezpośrednie użycie sqlite3) do połączenia z plikiem app_data.sqlite3 aplikacji CDC.

Połączenie będzie używane tylko do odczytu.

Interakcja z Aplikacją CDC (dla narzędzi wywołujących komendy):

Użycie modułu child_process (exec lub spawn) do wywoływania node app.js ... z projektu CDC.

Ścieżka do app.js z CDC będzie konfigurowalna (np. zmienna środowiskowa).

D. Zmiany w clickup-data-collector (CDC):

Minimalne lub żadne. Jeśli komendy CLI zwracają użyteczne kody wyjścia i ich output jest w miarę parsowalny (lub wystarczy nam informacja o sukcesie/błędzie), to być może nie trzeba nic zmieniać.

To podejście wydaje się dobrze równoważyć Twoje wymagania dotyczące prostoty, MVP i minimalnej inwazyjności. Serwer MCP staje się lekkim serwerem narzędziowym, który albo bezpośrednio czyta dane, albo deleguje zadania modyfikujące/synchronizujące do istniejącej, stabilnej aplikacji CDC.
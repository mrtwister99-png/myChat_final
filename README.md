# blbEchat

Expo chat s autentizací PINem, administrací a serverem Socket.IO na Railway.

## Bezpečnostní změny

- Rozhodování o PINu probíhá pouze v `server/pinRouter.js`.
- Klient posílá jen `auth:attempt` a neobsahuje speciální PINy ani speciální role.
- Server vyžaduje všechny tajné proměnné prostředí bez fallbacků.
- Aktivní uživatelský a admin PIN se načítá ze serveru a tabulky `active_pins`.
- Rotace PINu roomky uloží nový PIN, zavolá `kickAllUsers()` a zruší staré přihlášení.
- Firebase konfigurace se načítá z `expo.extra.firebase`.

## Lokální nastavení

1. Zkopírujte `.env.example` do `.env`.
2. Do klientské části vložte pouze:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_SOCKET_URL`
3. Serverové proměnné nastavte pouze v prostředí serveru:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_SETUP_SECRET`
   - `USER_PIN`
   - `ADMIN_PIN`
   - `HONEY_PIN`
   - `DURESS_PIN`
4. Doplňte Firebase hodnoty v `app.json` v objektu `expo.extra.firebase`.
5. Aplikaci spusťte přes `npx expo start`.

Nikdy nevkládejte skutečné hodnoty do Gitu, tohoto README ani do klientského kódu.

## Supabase

Spusťte obsah `server/supabase-schema.sql` v SQL editoru projektu. PINy se do databáze nevkládají pomocí SQL výchozích hodnot. Server je při prvním spuštění načte z `active_pins`, případně použije povinné proměnné prostředí.

## Railway

V Railway otevřete službu backendu, záložku **Variables** a nastavte serverové proměnné z `.env.example` s novými hodnotami. `SUPABASE_SERVICE_ROLE_KEY` patří pouze na Railway, nikdy do Expo aplikace. Po uložení spusťte nový deploy.

Pro klienta nastavte `EXPO_PUBLIC_SOCKET_URL` na veřejnou Railway URL backendu a ostatní `EXPO_PUBLIC_*` hodnoty v lokálním `.env` nebo v EAS prostředí.

## EAS

V EAS nastavte klientské proměnné jako plain nebo secret podle citlivosti:

```powershell
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value [SUPABASE_URL]
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value [SUPABASE_ANON_KEY]
eas env:create --name EXPO_PUBLIC_SOCKET_URL --value [RAILWAY_SOCKET_URL]
```

Potom vytvořte nový Android build:

```powershell
eas build -p android --profile preview
```

Serverové proměnné `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SETUP_SECRET`, `USER_PIN`, `ADMIN_PIN`, `HONEY_PIN` a `DURESS_PIN` do EAS nedávejte.

## Odstranění citlivých souborů z historie

Před přepisem historie si vytvořte zálohu repozitáře a upozorněte spolupracovníky. Pokud byly hodnoty někdy zveřejněné, nejdřív je zneplatněte a vytvořte nové.

```powershell
git filter-repo --path .env --path google-services.json --path GoogleService-Info.plist --invert-paths
git push --force --all origin
git push --force --tags origin
```

Po přepsání historie zkontrolujte, že soubory ignoruje `.gitignore`, a používejte pouze nové klíče a PINy.

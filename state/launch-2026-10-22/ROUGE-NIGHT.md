# Rouge — Saturday 24 October

## Door guide (for security — print or send as a picture)

**Outly fast lane = Outly pass + event ticket.** The pass alone is not a ticket.

1. Open **https://staff.&lt;domain&gt;** on your phone, log in with the email and password you were given (never share them). Tap **Door**. Allow the camera.
2. Guest shows their **Outly pass** (QR code on their phone) **and their ticket**.
3. Point the camera at the QR code:
   - **Green — Fast lane OK** (with the guest's @username) → check their ticket → let them in.
   - **Pass already used** → scanned before (a screenshot?) → normal line.
   - **Invalid pass** / **Not for tonight** → not a valid Outly pass for tonight → normal line.
   - **Pass not active** → booking cancelled → normal line.
   - **Pass blocked** → account suspended → normal line, tell the manager.
   - **No connection** / **No answer** → check wifi / 4G and scan again, or normal line.
4. Tap **Scan next** for the next guest (it also comes back by itself after a green result).
5. Problem with the site? **Use the normal line with the ticket.** Nobody waits because of Outly.

Tips: screen brightness up on the guest's phone; keep your phone charged (the scanner keeps the screen on).

## Pour Gabriel — le soir même

**Avant l'ouverture des portes (≈ 20 h)**
- Chaque vigile se connecte une fois sur `https://staff.<domaine>` et fait un scan d'essai avec ton pass de test → « Not for tonight » avant le 24, puis « Fast lane OK » le 24 (le pass de test est ensuite « Pass already used » : utilise un compte de test, pas un vrai invité).
- Le manager de Rouge se connecte : onglet **Tonight** = inscrits, entrés, % classique, scans refusés.
- Batterie externe pour les téléphones de la porte.

**Pendant la soirée — quoi surveiller**
- **Scans refusés** qui montent vite (onglet Tonight du manager) → aller voir la porte.
- **Signalements** (report) d'invités : une personne de l'équipe Outly les regarde et peut suspendre un compte (Supabase → Table editor → `profiles` → `suspended_at` = maintenant). Un compte suspendu ne peut plus passer le fast lane ni voir la liste.
- Supabase → *Logs* si « Something went wrong » revient souvent.

**Plan B** : si le site ne répond pas, tout le monde passe par la file normale avec le billet. Rien d'autre à faire.

**Le lendemain (dimanche)**
- Bannir les comptes du personnel (Supabase → *Authentication → Users* → **Ban user**, pas supprimer).
- Noter les chiffres pour les CEO : inscrits, entrés par le fast lane, % classique, scans refusés, signalements.

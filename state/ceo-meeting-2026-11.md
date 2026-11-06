# Outly : point d'étape avec Gabriel (7 nov. 2026)

**En bref :** l'outil est en ligne depuis le 22 octobre. Rouge n'a pas produit de données, car l'appli n'a jamais été montrée aux invités. Les applis sur les stores et l'abonnement payant attendent vos décisions, certaines depuis octobre.

---

## 1. Rouge, le bilan honnête

**La soirée :** samedi 24 oct., 21 h à 3 h, rooftop Rouge (Pyrmont), environ 200 invités attendus. Avantage Outly : la file rapide (pass Outly + billet) et une promotion au bar.

**Les chiffres réels, lus dans la base :**

| | |
|---|---|
| Comptes au total | 5 : 2 comptes de l'équipe tech et 3 comptes partagés du personnel (porte, bar, équipe) |
| Inscrits sur la guest list | 1 (le test de Gabriel) |
| Entrées par la file rapide | 1 (le scan de test, le 24 oct. à 18 h 51) |
| Promotions bar utilisées | 0 |

**Pourquoi aucune donnée utile :** aucun invité ne s'est inscrit, parce que le lien et l'affiche avec le QR code n'ont jamais été diffusés aux invités. Ce n'est pas une panne.

**Ce que Rouge a prouvé :** sur les vrais sites, le test de Gabriel est allé jusqu'au bout : inscription, guest list, pass QR, scan à la porte.

## 2. Ce qui est prêt aujourd'hui

- **Site client** en ligne depuis le 22 oct. : https://outly-sydney.com
- **Site du personnel** (porte, bar, manager) : https://staff.outly-sydney.com
- Inscription par email et mot de passe, contrôle 18+, **CAPTCHA** anti-robots (Cloudflare).
- Guest list en mode **fantôme** (invisible, ne voit personne) ou **classique** (visible des autres « classiques »).
- Pass QR, scan à la porte avec la caméra du téléphone, promotion bar utilisable une fois par pass.
- Statistiques en direct pour le manager, suppression du compte par l'utilisateur.
- **Sécurité :** deux audits complets, 13 failles trouvées et corrigées avant le lancement, chacune avec un test automatique ; tous les contrôles sont au vert. Le 7 nov., une faille critique de Next.js (l'outil du site admin) a été corrigée.
- **Applis mobiles :** une version Android de test (fichier **APK**, installable sans le Play Store) est prête et a été testée de bout en bout sur la vraie plateforme : inscription, profil, soirée, pass QR. Pour l'iPhone, il faut d'abord un compte Apple Developer.
- Base de données Supabase (offre gratuite, hébergée à Sydney), domaine outly-sydney.com chez Cloudflare.

## 3. Les décisions à prendre

1. **Société, ABN et D-U-N-S.** L'ABN est le numéro d'entreprise australien ; le D-U-N-S, un identifiant international d'entreprise (gratuit via Apple), demandé par Apple et Google pour un compte au nom d'une société.
   - *Options :* créer la société maintenant, ou publier d'abord à titre personnel.
   - *Ce que ça bloque :* les paiements réels (Stripe) et les comptes stores au nom de la société.
   - *Recommandation :* trancher en premier, tout le reste en dépend.

2. **Compte Apple Developer.**
   - *Coût :* 99 USD par an (environ 149 AUD en Australie, à vérifier à l'achat).
   - *Ce que ça bloque :* toute version iPhone, même de test.

3. **Compte Google Play Console.**
   - *Coût :* 25 USD, une seule fois.
   - *Le piège :* un **nouveau compte personnel** doit faire tester l'appli par **au moins 12 testeurs pendant 14 jours d'affilée** avant de pouvoir la publier. Un compte **société** (avec D-U-N-S) en est dispensé.
   - *Recommandation :* compte société si le D-U-N-S arrive vite ; sinon, compte personnel tout de suite pour lancer les 14 jours.

4. **Formules d'abonnement, prix et essai gratuit.**
   - *Prévu :* 3 à 5 formules. Essai gratuit : « 1 heure » ou « première soirée offerte, carte demandée ».
   - *Aussi à décider :* qui paie les avantages des abonnés, avec quels plafonds, et l'offre boissons exacte avec les lieux.
   - *Ce que ça bloque :* le développement de l'abonnement.

5. **Moyen de paiement.**
   - *Prévu :* **Stripe** (paiement par carte). Les avantages étant consommés dans de vrais lieux, la règle 3.1.3(e) d'Apple devrait le permettre, mais c'est Apple qui tranche à la vérification.
   - *Secours :* si Apple refuse, le paiement intégré d'Apple et de Google, qui prennent en général 15 à 30 % de commission.
   - *Ce que ça demande :* Stripe en vrai exige les informations de la société.
   - *Recommandation :* Stripe.

6. **Prochain vrai événement de test.**
   - *Questions :* quel lieu, quelle date, et surtout **qui envoie le lien aux invités, et comment** (email de billetterie, Instagram du lieu, affiche à l'entrée).
   - *Recommandation :* obtenir l'accord du lieu pour diffuser le lien ; sans diffusion prévue, on refait Rouge.

7. **Supabase Pro (sauvegardes quotidiennes).**
   - *Coût :* environ 25 USD par mois.
   - *Pourquoi :* l'offre gratuite actuelle n'a pas de sauvegarde quotidienne. À activer avant d'avoir de vrais utilisateurs en nombre.

## 4. Calendrier réaliste (estimation)

À compter du jour de vos décisions (semaine 0) :

| Quand | Quoi |
|---|---|
| Semaine 0 | Vos décisions (points 1 à 6) |
| Semaines 1 à 2 | Comptes Apple, Google et Stripe. Développement de l'abonnement. Versions de test iPhone et Android |
| Semaines 2 à 4 | **Compte Google personnel :** 14 jours de test avec au moins 12 testeurs. **Voie société :** délai d'obtention du D-U-N-S |
| Semaines 4 à 5 | Envoi aux stores. Vérification d'Apple : 1 à 2 jours en général, refus possible (une semaine de marge) |
| En parallèle | Prochain événement de test sur le site web, déjà prêt et indépendant des stores |

En pratique, les applis arrivent sur les stores **environ 4 à 6 semaines après vos décisions**, pas avant.

## 5. Ce dont l'équipe tech a besoin de vous

- **Des réponses** aux points 1 à 5 : elles bloquent tout le reste.
- **Le feu vert pour les dépenses :** Apple, Google et Supabase Pro (montants ci-dessus).
- **Une date, un lieu** et une personne chargée d'envoyer le lien aux invités.
- **L'accord des lieux** sur l'offre boissons.

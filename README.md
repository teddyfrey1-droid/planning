# rh_planner

Ce dépôt contient une **base de code complète** pour un système de planification et de gestion RH inspiré de Combo HR, mais avec un design original et une architecture modulaire. Le projet est réparti en deux parties :

* `frontend` : une application **Next.js** (TypeScript) utilisant Tailwind CSS. Elle fournit les vues principales : tableau de planification hebdomadaire, gestion des collaborateurs, demandes d'absences, suivi des heures et tableau de bord manager.
* `backend` : une API **NestJS** (TypeScript) avec une structure modulaire (employees, shifts, leaves, auth, etc.) et connectée à une base **PostgreSQL** via TypeORM. Les règles métier (durée des pauses, repos, alertes) sont implémentées sous forme de services réutilisables.

Cette base de code se veut **propre et extensible** ; vous pourrez l'adapter ou l'enrichir selon vos règles spécifiques et votre charte graphique.

## Prérequis

* Node >= 18
* Yarn ou npm
* PostgreSQL (version > 12) en local ou via un service cloud

## Installation rapide

Clonez le dépôt et installez les dépendances pour le front et le back :

```bash
git clone <url-de-votre-repo> rh_planner
cd rh_planner

# Installation côté back
cd backend
npm install

# Installation côté front
cd ../frontend
npm install
```

Créez un fichier `.env` dans `backend` et `frontend` en vous inspirant des fichiers `.env.example` fournis. Les variables essentielles sont la connexion à la base de données et la clé JWT.

Pour lancer le serveur et le client en mode développement :

```bash
# dans un terminal (backend)
cd backend
npm run start:dev

# dans un autre terminal (frontend)
cd frontend
npm run dev
```

L’interface sera accessible sur `http://localhost:3000`, l’API sur `http://localhost:3333`.

## Structure générale

* `frontend/`
  * `app/` – Pages de l’application (Next.js `app` router)
  * `components/` – Composants réutilisables (tableaux, formulaires, layout, etc.)
  * `lib/` – Helpers et clients API (fetch avec typage)
  * `styles/` – Fichiers CSS/Tailwind globaux

* `backend/`
  * `src/app.module.ts` – Module racine NestJS
  * `src/employees/` – Module de gestion des employés (entité, contrôleur, service)
  * `src/shifts/` – Module de planification (entité, contrôleur, service, règles)
  * `src/leaves/` – Module de gestion des absences (types, demandes, soldes)
  * `src/auth/` – Authentification et autorisation (JWT, RBAC)
  * `src/common/` – Décorateurs, filtres, intercepteurs communs
  * `ormconfig.ts` – Configuration de la connexion PostgreSQL

## Fonctionnalités implémentées

### Frontend

* Affichage des collaborateurs avec recherche et filtres.
* Formulaire de création d’employé.
* Grille de planning hebdomadaire (vue par employés) avec aperçu des shifts.
* Vue analytique présentant heures budgétées vs heures réelles (exemple statique).
* Table de demandes d’absences et formulaire de création.
* Tableau de bord avec cartes d’indicateurs (heures, absences).

### Backend

* Authentification JWT (login, inscription de base).
* Endpoints CRUD pour les employés (`/employees`).
* Endpoints CRUD pour les shifts (`/shifts`) incluant la détection de conflits et la vérification des règles de pause/repos.
* Endpoints CRUD pour les demandes d’absences (`/leaves`).
* Système de rôles et permissions simple (admin, manager, employé).
* Journal d’audit (exemple basique) enregistrant les actions sensibles.

## Prochaines étapes

* Intégrer la gestion avancée des règles (mineurs, repos hebdomadaire, alertes) dans `backend/src/shifts/rules.service.ts`.
* Étendre l’interface pour les vues par jour, par mois et par étiquettes.
* Ajouter la messagerie interne et les articles (modules supplémentaires sur la même architecture).
* Connecter l’authentification aux rôles et aux permissions pour sécuriser l’accès aux pages.

## Licence

Ce projet est publié sous licence MIT. Vous êtes libre de le modifier et de l’adapter à votre usage.
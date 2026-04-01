# Déploiement sur Clever Cloud

Voici les commandes de base pour déployer l'application :

```bash
# 1. Créer l'application dans l'organisation
clever create --type node todo-<name> --org <organisation-id>

# 2. Créer et attacher le PostgreSQL dans l'organisation
clever addon create postgresql-addon pg-todo-<name> --plan dev --org <organisation-id>
clever service link-addon pg-todo-<name>

# 3. Configurer les variables d'environnement
clever env set APP_NAME todo-<name>

# 4. Déployer
git add .
git commit --allow-empty -m "reload config"
clever deploy
```

## Développement Local

```bash
docker run --name pg-todo -e POSTGRES_PASSWORD=<password> -e POSTGRES_DB=<db> -p 5432:5432 -d postgres:15

# 2. Configurer le fichier .env
# POSTGRESQL_ADDON_URI=postgresql://<user>:<password>@localhost:5432/<db>
# APP_NAME=<name>
# PORT=<port>

# 3. Installer et lancer
npm install
npm start
```
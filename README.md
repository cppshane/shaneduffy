# My Portfolio Site
So this is my personal portfolio/blog site, built with Angular/.NET/Mongo.
- Angular Universal SSR and Prerendering
- VSCode Launch Configurations for Angular/.NET Full Stack App
- Docker Prod/Dev Configurations for Angular/.NET Full Stack App

### Running it
You can run it with the VS Code configurations or the following Docker command in the API folder and the site folder:
```
docker-compose -f docker-compose.dev.yml up --build
```

The API docker will spin up a MongoDB instance that can be accessed via the following address:
```
mongodb://shane:password@172.17.0.1:27017/shaneduffy_database?authSource=shaneduffy_database
```

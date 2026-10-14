# <a href="https://shaneduffy.io">shaneduffy.io</a>
So this is my personal portfolio/blog site, built with Angular/.NET/Mongo.
- Angular Universal SSR and Prerendering
- VSCode Launch Configurations for Angular/.NET Full Stack App
- Docker Prod/Dev Configurations for Angular/.NET Full Stack App

### Running it
```
docker compose up
```

### Debugging
1. Start Docker
2. Ensure Chrome is installed locally
3. Open Workspace in VS Code with `code shaneduffy.code-workspace`
4. Run `Launch Workspace` task to start docker for Angular site, .NET API and MongoDB.
5. Wait for site to show up (refresh after site/api docker containers are done spinning up)
6. Begin setting breakpoints in .NET API code as well as Angular site code, it should break when hit.

### Frontend preview
From `site`, run `npm start`. The development server proxies `/api` to the local backend at `http://127.0.0.1:5000` using `proxy.conf.json`, so browser requests do not need a separate CORS origin for each preview port. The backend must be running to load articles and search results.

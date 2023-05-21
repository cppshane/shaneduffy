import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { AboutComponent } from "./components/about/about.component";
import { BlogPostComponent } from "./components/blog-post/blog-post.component";
import { HomeComponent } from "./components/home/home.component";
import { NotesPostComponent } from "./components/notes-post/notes-post.component";
import { NotesComponent } from "./components/notes/notes.component";
import { ProjectsComponent } from "./components/projects/projects.component";
import { KntBotComponent } from "./components/knt-bot/knt-bot.component";

const routes: Routes = [
  { path: "", component: HomeComponent },
  { path: "about", component: AboutComponent, pathMatch: "full" },
  { path: "projects", component: ProjectsComponent, pathMatch: "full" },
  { path: "blog/:uri", component: BlogPostComponent, pathMatch: "full" },
  { path: "notes", component: NotesComponent, pathMatch: "full" },
  { path: "notes/:uri", component: NotesPostComponent, pathMatch: "full" },
  { path: "knt-bot", component: KntBotComponent, pathMatch: "full" },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      initialNavigation: "enabled",
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
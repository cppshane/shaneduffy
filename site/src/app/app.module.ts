import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { HomeComponent } from './components/home/home.component';
import { BlogPostComponent } from './components/blog-post/blog-post.component';
import { NavComponent } from './components/nav/nav.component';
import { FooterComponent } from './components/footer/footer.component'
import { BlogListItemComponent } from './components/blog-list-item/blog-list-item.component';
import { AboutComponent } from './components/about/about.component'
import { ProjectsComponent } from './components/projects/projects.component'
import { HeaderComponent } from './components/header/header.component';
import { NotesPostComponent } from './components/notes-post/notes-post.component';
import { NotesComponent } from './components/notes/notes.component';

import { PostService } from './services/post.service';

import { SafePipe } from './pipes/safe.pipe';
import { KntBotComponent } from './components/knt-bot/knt-bot.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    BlogPostComponent,
    NotesComponent,
    NotesPostComponent,
    NavComponent,
    FooterComponent,
    BlogListItemComponent,
    AboutComponent,
    ProjectsComponent,
    HeaderComponent,
    KntBotComponent,
    SafePipe
  ],
  imports: [
    BrowserModule.withServerTransition({ appId: 'serverApp' }),
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    FontAwesomeModule
  ],
  providers: [PostService],
  bootstrap: [AppComponent]
})
export class AppModule { }
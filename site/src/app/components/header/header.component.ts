import { Component, Inject, PLATFORM_ID } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { isPlatformBrowser } from "@angular/common";
import { Post } from "src/app/models/post.model";
import { PostService } from "src/app/services/post.service";

@Component({
  selector: "app-header",
  templateUrl: "./header.component.html",
  styleUrls: ["./header.component.css"],
})
export class HeaderComponent {
  homeDisplayStyle = "none";
  blogPostDisplayStyle = "none";
  standardDisplayStyle = "none";

  blogPost?: Post;
  standardTitle?: string;

  constructor(
    private postService: PostService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Record<string, unknown> 
  ) {
    this.routeEvent(this.router);
  }

  routeEvent(router: Router) {
    router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        let rawpageId = e.url;

        const queryDelimiter = e.url.indexOf("?");
        if (queryDelimiter != -1) {
          rawpageId = e.url.substring(0, queryDelimiter);
        }

        const parts = rawpageId.split("/");
        let page = "";
        if (parts.length > 1) {
          page = parts[1];
        }
        let pageId = "";
        if (parts.length > 2) pageId = parts[2];

        if (page === "") {
          this.homeDisplayStyle = "flex";
          this.blogPostDisplayStyle = "none";
          this.standardDisplayStyle = "none";
        } else if (page === "about") {
          this.homeDisplayStyle = "none";
          this.blogPostDisplayStyle = "none";
          this.standardDisplayStyle = "flex";

          this.standardTitle = "About";
        } else if (page === "christine") {
          this.homeDisplayStyle = "none";
          this.blogPostDisplayStyle = "none";
          this.standardDisplayStyle = "flex";

          this.standardTitle = "Christine's Secret Page";
        } else if (page === "projects") {
          this.homeDisplayStyle = "none";
          this.blogPostDisplayStyle = "none";
          this.standardDisplayStyle = "flex";

          this.standardTitle = "Projects";
        } else if (page === "notes" && pageId === "") {
          this.homeDisplayStyle = "none";
          this.blogPostDisplayStyle = "none";
          this.standardDisplayStyle = "flex";

          this.standardTitle = "Notes";
        } else if (page === "notes" && pageId !== "") {
          this.postService.getNotesPost(pageId, (result: Post) => {
            this.blogPost = result;

            this.homeDisplayStyle = "none";
            this.blogPostDisplayStyle = "flex";
            this.standardDisplayStyle = "none";
          });
        } else if (page === "blog") {
          this.postService.getBlogPost(pageId, (result: Post) => {
            this.blogPost = result;

            this.homeDisplayStyle = "none";
            this.blogPostDisplayStyle = "flex";
            this.standardDisplayStyle = "none";
          });
        }

        if (isPlatformBrowser(this.platformId)) window.scrollTo(0, 0);
      }
    });
  }
}
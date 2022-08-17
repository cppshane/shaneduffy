import { Component, ElementRef, ViewChild } from "@angular/core";
import { Router } from "@angular/router";
import { Post } from "src/app/models/post.model";
import { SearchResponse } from "src/app/models/search-response.model";
import { PostService } from "src/app/services/post.service";

@Component({
  selector: "app-nav",
  templateUrl: "./nav.component.html",
  styleUrls: ["./nav.component.css"],
  host: {
    '(window: popstate)': 'backButton()'
  }
})
export class NavComponent {
  @ViewChild("searchSidebar", { static: true }) searchSidebar?: ElementRef;
  @ViewChild("searchControl", { static: true }) searchControl?: ElementRef;
  @ViewChild("searchInput", { static: true }) searchInput?: ElementRef;

  searchSidebarOpen = false;
  searchText = "";
  searchResults = new Array<Post>();
  maxResults = 50;

  constructor(private postService: PostService, private router: Router) { }

  toggleSearchSidebar() {
    if (this.searchSidebar != null && this.searchControl != null) {
      if (!this.searchSidebarOpen) {
        this.openSidebar();
      } else {
        this.closeSidebar();
      }
    }
  }

  backButton() {
    if (this.searchSidebarOpen) {
      this.closeSidebar();
    }
  }

  openSidebar() {
    if (this.searchSidebar != null && this.searchControl != null) {
      this.searchSidebar.nativeElement.classList.remove(
        "search-sidebar-closed"
      );
      this.searchSidebar.nativeElement.classList.add("search-sidebar-open");

      this.searchControl.nativeElement.classList.remove(
        "search-control-closed"
      );
      this.searchControl.nativeElement.classList.add("search-control-open");

      this.searchSidebarOpen = true;
      this.searchInput?.nativeElement.focus();

      this.router.navigate([this.router.url], {fragment: 'search'});
    }
  }

  closeSidebar() {
    if (this.searchSidebar != null && this.searchControl != null) {
      this.searchSidebar.nativeElement.classList.remove("search-sidebar-open");
      this.searchSidebar.nativeElement.classList.add("search-sidebar-closed");

      this.searchControl.nativeElement.classList.remove("search-control-open");
      this.searchControl.nativeElement.classList.add("search-control-closed");

      this.searchSidebarOpen = false;

      this.router.navigate([this.router.url]);
    }
  }

  applySearch() {
    this.searchResults = new Array<Post>();
    this.postService.getBlogPosts(
      this.searchText,
      [],
      0,
      this.maxResults,
      (searchResponse: SearchResponse) => {
        this.searchResults = searchResponse.Posts;
      }
    );
  }
}
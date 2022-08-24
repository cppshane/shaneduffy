import { Component, ElementRef, ViewChild } from "@angular/core";
import { ActivatedRoute, NavigationEnd, NavigationStart, Params, Router } from "@angular/router";
import { Post } from "src/app/models/post.model";
import { SearchResponse } from "src/app/models/search-response.model";
import { PostService } from "src/app/services/post.service";

@Component({
  selector: "app-nav",
  templateUrl: "./nav.component.html",
  styleUrls: ["./nav.component.css"],
  host: {
    '(window:scroll)': 'onScroll()'
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

  constructor(
    private postService: PostService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {

        // Only preserve scroll position if changing query params
        if (event.url.split('?')[0] != router.url.split('?')[0]) {
          localStorage.removeItem('scroll');
        } else {
          localStorage.setItem('scroll', window.scrollY.toString());
        }
        return;
      }

      const scrollTo = Number(localStorage.getItem('scroll'));

      if (document.body.scrollHeight != 0 && !isNaN(scrollTo)) {
        window.scrollTo(0, scrollTo);
      }
    });

    this.route.queryParams.subscribe((value: Params) => {
      if (value['search'] != null && !this.searchSidebarOpen) {
        this.openSidebar();
      } else if (value['search'] == null && this.searchSidebarOpen) {
        this.closeSidebar();
      }
    });
  }

  onScroll() {
    //localStorage.setItem('scroll', window.scrollY.toString());
  }

  navToSearch() {
    localStorage.setItem('scroll', window.scrollY.toString());
    this.router.navigate([ this.router.url.split('?')[0] ], { queryParams: { search: '' }, queryParamsHandling: 'merge' });
  }

  navOutSearch() {
    const params = this.router.url.split('?');
    let newQp = '';
    if (params.length > 1) {
      let withoutSearchParam = params[1];
      withoutSearchParam = withoutSearchParam.replace('search=&', '');
      withoutSearchParam = withoutSearchParam.replace('search=', '');
      newQp = '?' + withoutSearchParam;
    }
    const newUri = params[0] + newQp;
    this.router.navigateByUrl(newUri);
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
    }
  }

  closeSidebar() {
    if (this.searchSidebar != null && this.searchControl != null) {
      this.searchSidebar.nativeElement.classList.remove("search-sidebar-open");
      this.searchSidebar.nativeElement.classList.add("search-sidebar-closed");

      this.searchControl.nativeElement.classList.remove("search-control-open");
      this.searchControl.nativeElement.classList.add("search-control-closed");

      this.searchSidebarOpen = false;
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

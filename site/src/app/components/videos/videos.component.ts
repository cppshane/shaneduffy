import {
  Component,
  Inject,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
} from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { SearchResponse } from "src/app/models/search-response.model";
import { Post } from "../../models/post.model";
import { PostService } from "../../services/post.service";
import { Title } from "@angular/platform-browser";

@Component({
  selector: "app-videos",
  templateUrl: "./videos.component.html",
  styleUrls: ["./videos.component.css"],
})
export class VideosComponent {
  @ViewChild("blogSectionContainer", { static: true })
  blogSectionContainer!: ElementRef;
  readonly postsPerPage = 5;
  blogPosts: Array<Post> = new Array<Post>();
  postsFailed = false;
  totalPages = 0;
  currentPage = 0;

  constructor(
    private postService: PostService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private titleService: Title,
    @Inject(PLATFORM_ID) private platformId: Record<string, unknown>
  ) {
    this.activatedRoute.queryParams.subscribe((params) => {
      const pageParam = params["page"];

      let page = 0;
      if (pageParam != null && pageParam != 0) {
        page = pageParam;
        page = page - 1;
      }

      // Avoid reloading if data already loaded
      if (this.currentPage == page && this.blogPosts.length != 0) {
        return;
      }

      this.postsFailed = false;
      postService.getAllVideoPosts(
        page,
        this.postsPerPage,
        (searchResponse: SearchResponse) => {
          this.totalPages = searchResponse.TotalPages;
          this.currentPage = searchResponse.CurrentPage;
          this.blogPosts = [];
          for (const blogPost of searchResponse.Posts) {
            this.blogPosts.push(blogPost);
          }
          if (pageParam != null && isPlatformBrowser(this.platformId)) {
            this.blogSectionContainer?.nativeElement.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        },
        () => { this.postsFailed = true; }
      );
    });
  }

  ngOnInit() {
    this.titleService.setTitle("Videos");
  }

  pageClick(i: number) {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { page: (i + 1).toString() },
      queryParamsHandling: 'merge',
      preserveFragment: true,
    });
  }
}
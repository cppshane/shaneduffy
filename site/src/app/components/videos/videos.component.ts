import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  ViewChild,
} from "@angular/core";
import { Location } from "@angular/common";
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
  totalPages = 0;
  currentPage = 0;

  constructor(
    private postService: PostService,
    private activatedRoute: ActivatedRoute,
    private location: Location,
    private changeDetectorRef: ChangeDetectorRef,
    private router: Router,
    private titleService: Title
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

      postService.getBlogPosts(
        "",
        [],
        page,
        this.postsPerPage,
        (searchResponse: SearchResponse) => {
          this.totalPages = searchResponse.TotalPages;
          this.currentPage = searchResponse.CurrentPage;
          this.blogPosts = [];
          for (const blogPost of searchResponse.Posts) {
            if (blogPost.Video) {
              this.blogPosts.push(blogPost);
            }
          } 
          if (pageParam != null) {
            this.blogSectionContainer?.nativeElement.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }
      );
    });
  }

  ngOnInit() {
    this.titleService.setTitle("Videos");
  }

  pageClick(i: number) {
    this.router.navigate([ this.router.url.split('?')[0] ], { queryParams: { page: (i + 1).toString() }, queryParamsHandling: 'merge' });
  }
}
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  ViewChild,
} from "@angular/core";
import { Location } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { SearchResponse } from "src/app/models/search-response.model";
import { Post } from "../../models/post.model";
import { PostService } from "../../services/post.service";
import { Title } from "@angular/platform-browser";

@Component({
  selector: "app-home",
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.css"],
})
export class HomeComponent {
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
    private titleService: Title
  ) {
    this.activatedRoute.queryParams.subscribe((params) => {
      const pageParam = params["page"];
      let page = 0;
      if (pageParam != null && pageParam != 0) {
        page = pageParam;
        page = page - 1;
      }
      postService.getBlogPosts(
        "",
        [],
        page,
        this.postsPerPage,
        (searchResponse: SearchResponse) => {
          this.totalPages = searchResponse.TotalPages;
          this.currentPage = searchResponse.CurrentPage;
          for (const blogPost of searchResponse.Posts) {
            this.blogPosts.push(blogPost);
          }
          this.changeDetectorRef.detectChanges();
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
    this.titleService.setTitle("Shane Duffy");
  }

  pageClick(i: number) {
    this.postService.getBlogPosts(
      "",
      [],
      i,
      this.postsPerPage,
      (searchResponse: SearchResponse) => {
        this.totalPages = searchResponse.TotalPages;
        this.currentPage = searchResponse.CurrentPage;
        this.blogPosts = new Array<Post>();
        for (const blogPost of searchResponse.Posts) {
          this.blogPosts.push(blogPost);
        }
        this.location.replaceState("/?page=" + (i + 1).toString());
        this.changeDetectorRef.detectChanges();

        if (this.blogSectionContainer?.nativeElement instanceof HTMLElement) {
          this.blogSectionContainer?.nativeElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
    );
  }
}
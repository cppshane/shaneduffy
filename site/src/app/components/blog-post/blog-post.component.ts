import { Component, Inject, OnInit, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { Post } from "../../models/post.model";
import { PostService } from "../../services/post.service";
import { Title } from "@angular/platform-browser";

declare const hljs: any;

@Component({
  selector: "app-blog-post",
  templateUrl: "./blog-post.component.html",
  styleUrls: ["./blog-post.component.css"],
})
export class BlogPostComponent implements OnInit {
  blogPost?: Post;

  constructor(
    private blogService: PostService,
    private activatedRoute: ActivatedRoute,
    private titleService: Title,
    @Inject(PLATFORM_ID) private platformId: Record<string, unknown>
  ) {}

  ngOnInit() {
    this.titleService.setTitle("Shane Duffy");

    this.activatedRoute.params.subscribe((params) => {
      if (params.uri) {
        this.blogService.getBlogPost(params.uri, (result: Post) => {
          this.blogPost = result;

          if (this.blogPost)
            this.titleService.setTitle(this.blogPost.Title);
        });
      }
    });
  }

  ngAfterViewChecked() {
    if (isPlatformBrowser(this.platformId)) {
      const codeElements = document.getElementsByTagName("code");

      for (let i = 0; i < codeElements.length; i++) {
        hljs.highlightBlock(codeElements[i]);
      }
    }
  }
}
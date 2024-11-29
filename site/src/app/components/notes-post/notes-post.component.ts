import { Component, Inject, OnInit, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { Post } from "../../models/post.model";
import { PostService } from "../../services/post.service";
import { Title } from "@angular/platform-browser";

declare const hljs: any;
declare const MathJax: any;

@Component({
  selector: "app-notes-post",
  templateUrl: "./notes-post.component.html",
  styleUrls: ["./notes-post.component.css"],
})
export class NotesPostComponent implements OnInit {
  notesPost?: Post;

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
        this.blogService.getNotesPost(params.uri, (result: Post) => {
          this.notesPost = result;

          if (this.notesPost)
            this.titleService.setTitle(this.notesPost.Title);
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

      if (MathJax.typeset) {
        MathJax.typeset();
      }
    }
  }
}